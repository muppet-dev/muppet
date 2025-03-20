import { sValidator } from "@hono/standard-validator";
import {
  CallToolRequestSchema,
  ErrorCode,
  InitializeRequestSchema,
  LATEST_PROTOCOL_VERSION,
  RequestSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "@modelcontextprotocol/sdk/types.js";
import { Hono } from "hono";
import type { BlankEnv, BlankSchema, Env, Schema } from "hono/types";
import type { Logger } from "pino";
import type {
  ConceptConfiguration,
  MuppetConfiguration,
  PromptConfiguration,
  ServerConfiguration,
  ToolHandlerResponse,
} from "./types";
import { McpPrimitives, uniqueSymbol } from "./utils";

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

  const serverConfiguration = await generateSpecs(hono, config);
  const hasTools = McpPrimitives.TOOLS in serverConfiguration;
  const hasPrompts = McpPrimitives.PROMPTS in serverConfiguration;

  const mcp = new Hono();

  mcp.post(
    "/initialize",
    sValidator("json", InitializeRequestSchema),
    async (c) => {
      messageId = -1;
      const { params } = c.req.valid("json");

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
            prompt: hasPrompts ? {} : undefined,
          },
        },
      });
    },
  );

  mcp.route("/tools", createToolsApp(serverConfiguration, hono));

  mcp.post("/notifications/initialized", (c) => {
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

    const response = await mcp.fetch(
      new Request(`http://muppet.mcp/${validatedMessage.method}`, {
        method: "POST",
        body: JSON.stringify(message),
        headers: {
          "content-type": "application/json",
        },
      }),
    );

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
>(
  hono: Hono<E, S, P>,
  config: MuppetConfiguration,
): Promise<ServerConfiguration> {
  const configuration: ServerConfiguration = {
    name: config.name,
    version: config.version,
  };

  const concepts: ConceptConfiguration = {};

  for (const route of hono.routes) {
    if (!(uniqueSymbol in route.handler)) continue;

    const { resolver, type } = route.handler[
      uniqueSymbol
    ] as ToolHandlerResponse;

    const result = await resolver();

    const concept = concepts[route.path];

    if (concept?.type && type && concept.type !== type) {
      throw new Error(
        `Conflicting types for ${route.path}: ${concept.type} and ${type}`,
      );
    }

    concepts[route.path] = {
      ...result,
      type,
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
        name: path,
        ...concept,
        inputSchema: concept.schema ?? {},
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
        name: path,
        ...concept,
        arguments: args,
      };
    }
  }

  return configuration;
}

function createToolsApp(config: ServerConfiguration, hono: Hono) {
  const app = new Hono().use(async (_c, next) => {
    if (!(McpPrimitives.TOOLS in config)) {
      throw new Error("No tools available");
    }

    await next();
  });

  app.post("/list", (c) => {
    return c.json({
      result: {
        tools: config.tools,
      },
    });
  });

  app.post("/call", sValidator("json", CallToolRequestSchema), async (c) => {
    const { params } = c.req.valid("json");

    const path = config.tools?.[params.name].path;

    const res = await hono.fetch(
      new Request(`http://muppet.mcp${path}`, {
        ...c.req.raw,
      }),
    );

    const json = await res.json();

    return c.json({ result: json });
  });

  return app;
}
