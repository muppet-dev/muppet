import { sValidator } from "@hono/standard-validator";
import {
  CallToolRequestSchema,
  ErrorCode,
  GetPromptRequestSchema,
  InitializeRequestSchema,
  LATEST_PROTOCOL_VERSION,
  ReadResourceRequestSchema,
  RequestSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "@modelcontextprotocol/sdk/types.js";
import { Hono } from "hono";
import type { BlankEnv, BlankSchema, Env, Schema } from "hono/types";
import type { JSONSchema7 } from "json-schema";
import type { Logger } from "pino";
import type {
  AvailableEvents,
  ConceptConfiguration,
  DescribeOptions,
  MuppetConfiguration,
  PromptConfiguration,
  ServerConfiguration,
  ToolHandlerResponse,
} from "./types";
import { McpPrimitives, uniqueSymbol } from "./utils";

type BaseEnv = {
  Variables: {
    logger?: Logger;
  };
};

export async function muppet<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(hono: Hono<E, S, P>, config: MuppetConfiguration) {
  let messageId = -1;
  const { transport, logger: _logger } = config;

  let logger: Logger | undefined;

  if (_logger) {
    const pino = await import("pino").then((pino) => pino.default);

    if (_logger.options) {
      logger = pino(_logger.options, _logger.stream);
    } else if (_logger.stream) {
      logger = pino(_logger.stream);
    } else {
      logger = pino();
    }
  }

  let serverConfiguration: ServerConfiguration;

  try {
    serverConfiguration = await generateSpecs(hono);
  } catch (err) {
    logger?.error({ err }, "Failed to generate server configuration");
    return;
  }

  const mcp = new Hono<BaseEnv>().use(async (c, next) => {
    logger?.info(
      { method: c.req.method, path: c.req.path },
      "Incoming request",
    );

    c.set("logger", logger);

    await next();

    logger?.info({ status: c.res.status }, "Outgoing response");
  });

  mcp.post(
    "/initialize",
    sValidator("json", InitializeRequestSchema),
    async (c) => {
      messageId = -1;
      const { params } = c.req.valid("json");

      const hasTools = McpPrimitives.TOOLS in serverConfiguration;
      const hasPrompts = McpPrimitives.PROMPTS in serverConfiguration;
      const hasResources = McpPrimitives.RESOURCES in serverConfiguration;

      return c.json({
        result: {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(
            params?.protocolVersion,
          )
            ? params.protocolVersion
            : LATEST_PROTOCOL_VERSION,
          serverInfo: {
            name: config.name,
            version: config.version,
          },
          capabilities: {
            tools: hasTools ? {} : undefined,
            prompts: hasPrompts ? {} : undefined,
            resources: hasResources ? {} : undefined,
          },
        },
      });
    },
  );

  mcp.route("/tools", createToolsApp(serverConfiguration, hono));
  mcp.route("/prompts", createPromptApp(serverConfiguration, hono));
  mcp.route("/resources", createResourceApp(config, serverConfiguration, hono));

  mcp.post("/notifications/:event", (c) => {
    config.events?.emit(
      c,
      `notifications/${c.req.param("event")}` as keyof AvailableEvents,
      undefined,
    );

    return c.body(null, 204);
  });

  mcp.post("/ping", (c) => c.json({ result: {} }));

  mcp.notFound((c) => {
    logger?.info("Method not found");

    return c.json({
      error: {
        code: ErrorCode.MethodNotFound,
        message: "Method not found",
      },
    });
  });

  mcp.onError((err, c) => {
    logger?.error({ err }, "Internal error");

    return c.json({
      error: {
        // @ts-expect-error
        code: Number.isSafeInteger(err.code)
          ? // @ts-expect-error
            err.code
          : ErrorCode.InternalError,
        message: err.message ?? "Internal error",
      },
    });
  });

  // Binding it with the transport
  transport.onclose = () => {
    logger?.info("Connection closed");
  };

  transport.onmessage = async (message) => {
    logger?.info(
      { message, string: JSON.stringify(message) },
      "Received message",
    );

    const validatedMessage = RequestSchema.parse(message);

    const response = await mcp.request(validatedMessage.method, {
      method: "POST",
      body: JSON.stringify(message),
      headers: {
        "content-type": "application/json",
      },
    });

    // If there's no payload, we don't need to send a response. Eg. Notifications
    if (response.status === 204) return;

    const payload = await response.json();

    logger?.info({ payload }, "Response payload");

    messageId++;
    logger?.info({ messageId });

    await transport
      .send({
        ...payload,
        jsonrpc: "2.0",
        id: messageId,
      })
      .then(() => logger?.info("Sent response"))
      .catch((error) => logger?.error(error, "Failed to send cancellation"));
  };

  transport.start();
}

export async function generateSpecs<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(hono: Hono<E, S, P>) {
  const configuration: ServerConfiguration = {};

  const concepts: ConceptConfiguration = {};

  for (const route of hono.routes) {
    if (!(uniqueSymbol in route.handler)) continue;

    const { resolver, type } = route.handler[
      uniqueSymbol
    ] as ToolHandlerResponse;

    let result: DescribeOptions | JSONSchema7;

    if (typeof resolver === "function") {
      result = await resolver();
    } else {
      result = resolver ?? {};
    }

    const concept = concepts[route.path];

    if (concept?.type && type && concept.type !== type) {
      throw new Error(
        `Conflicting types for ${route.path}: ${concept.type} and ${type}`,
      );
    }

    concepts[route.path] = {
      ...result,
      ...(concepts[route.path] ?? {}),
      type: type ?? concept?.type,
      path: route.path,
    };
  }

  for (const [path, concept] of Object.entries(concepts)) {
    if (!concept) continue;

    if (!concept.type) {
      throw new Error(`Type not found for ${path}`);
    }

    if (concept.type === McpPrimitives.TOOLS) {
      if (!configuration.tools) {
        configuration.tools = {};
      }

      const key = concept.name ?? path;

      configuration.tools[key] = {
        name: key,
        description: concept.description,
        inputSchema: concept.schema ?? {},
        path,
      };
    } else if (concept.type === McpPrimitives.PROMPTS) {
      if (!configuration.prompts) {
        configuration.prompts = {};
      }

      const key = concept.name ?? path;

      const args: PromptConfiguration[string]["arguments"] = [];

      for (const arg of Object.keys(concept.schema?.properties ?? {})) {
        args.push({
          name: arg,
          // @ts-expect-error
          description: concept.schema?.properties?.[arg].description,
          required: concept.schema?.required?.includes(arg) ?? false,
        });
      }

      configuration.prompts[key] = {
        name: key,
        description: concept.description,
        arguments: args,
        path,
      };
    } else if (concept.type === McpPrimitives.RESOURCES) {
      if (!configuration.resources) {
        configuration.resources = {};
      }
    }
  }

  return configuration;
}

function createToolsApp<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(config: ServerConfiguration, hono: Hono<E, S, P>) {
  const app = new Hono<BaseEnv>().use(async (_c, next) => {
    if (!(McpPrimitives.TOOLS in config)) {
      throw new Error("No tools available");
    }

    await next();
  });

  app.post("/list", (c) =>
    c.json({
      result: {
        tools: Object.values(config.tools ?? {}).map(
          ({ path, ...tool }) => tool,
        ),
      },
    }),
  );

  app.post("/call", sValidator("json", CallToolRequestSchema), async (c) => {
    const { params } = c.req.valid("json");

    const path = config.tools?.[params.name].path;

    if (!path) {
      throw new Error("Unable to find the path for the tool!");
    }

    const res = await hono.request(path, {
      method: "POST",
      body: JSON.stringify(params.arguments),
      headers: {
        ...c.req.header(),
        "content-type": "application/json",
      },
    });

    const json = await res.json();

    return c.json({ result: json });
  });

  return app;
}

function createPromptApp<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(config: ServerConfiguration, hono: Hono<E, S, P>) {
  const app = new Hono<BaseEnv>().use(async (_c, next) => {
    if (!(McpPrimitives.PROMPTS in config)) {
      throw new Error("No prompts available");
    }

    await next();
  });

  app.post("/list", (c) => {
    return c.json({
      result: {
        prompts: Object.values(config.prompts ?? {}).map(
          ({ path, ...prompt }) => prompt,
        ),
      },
    });
  });

  app.post("/get", sValidator("json", GetPromptRequestSchema), async (c) => {
    const { params } = c.req.valid("json");

    const prompt = config.prompts?.[params.name];

    if (!prompt) {
      throw new Error("Unable to find the path for the tool!");
    }

    const res = await hono.request(prompt.path, {
      method: "POST",
      body: JSON.stringify(params.arguments),
      headers: {
        ...c.req.header(),
        "content-type": "application/json",
      },
    });

    const json = await res.json();

    if (Array.isArray(json))
      return c.json({
        result: { description: prompt.description, messages: json },
      });

    return c.json({ result: json });
  });

  return app;
}

function createResourceApp<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(
  muppet: MuppetConfiguration,
  config: ServerConfiguration,
  hono: Hono<E, S, P>,
) {
  const app = new Hono<BaseEnv>().use(async (_c, next) => {
    if (!(McpPrimitives.RESOURCES in config)) {
      throw new Error("No resources available");
    }

    await next();
  });

  app.post("/list", async (c) => {
    const resources = await Promise.all(
      Object.values(config.resources ?? {}).map(async ({ path }) => {
        const res = await hono.request(path, {
          method: "POST",
          headers: c.req.header(),
        });

        return res.json();
      }),
    );

    return c.json({
      result: {
        resources: resources.flat(),
      },
    });
  });

  app.post(
    "/read",
    sValidator("json", ReadResourceRequestSchema),
    async (c) => {
      const { params } = c.req.valid("json");

      const protocol = params.uri.split(":")[0];
      const handler = muppet.resources?.[protocol];

      if (!handler) {
        throw new Error(`Unable to find the handler for ${protocol} protocol!`);
      }

      const contents = handler(params.uri);

      if (Array.isArray(contents))
        return c.json({
          result: { contents },
        });

      return c.json({ result: contents });
    },
  );

  return app;
}
