import { sValidator } from "@hono/standard-validator";
import {
  type Resource as McpResource,
  type ResourceTemplate as McpResourceTemplate,
  CallToolRequestSchema,
  ErrorCode,
  GetPromptRequestSchema,
  InitializeRequestSchema,
  LATEST_PROTOCOL_VERSION,
  ReadResourceRequestSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "@modelcontextprotocol/sdk/types.js";
import { Hono, type Context } from "hono";
import type { BlankEnv, BlankSchema, Env, Schema } from "hono/types";
import type { JSONSchema7 } from "json-schema";
import type { Logger } from "pino";
import type {
  AvailableEvents,
  ConceptConfiguration,
  DescribeOptions,
  MuppetConfiguration,
  PromptConfiguration,
  Resource,
  ServerConfiguration,
  ToolHandlerResponse,
} from "./types";
import { getRequestInit, McpPrimitives, uniqueSymbol } from "./utils";

export async function muppet<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(hono: Hono<E, S, P>, config: MuppetConfiguration) {
  const { logger } = config;

  let specs: ServerConfiguration;

  try {
    specs = await generateSpecs(hono);
  } catch (err) {
    logger?.error({ err }, "Failed to generate server configuration");
    return;
  }

  type BaseEnv = {
    Variables: {
      logger?: Logger;
      muppet: MuppetConfiguration;
      specs: ServerConfiguration;
      app: Hono<E, S, P>;
    };
  };

  const mcp = new Hono<BaseEnv>().use(async (c, next) => {
    logger?.info(
      { method: c.req.method, path: c.req.path },
      "Incoming request",
    );

    c.set("logger", logger);
    c.set("muppet", config);
    c.set("specs", specs);
    c.set("app", hono);

    await next();

    logger?.info({ status: c.res.status }, "Outgoing response");
  });

  // Init request
  mcp.post(
    "/initialize",
    sValidator("json", InitializeRequestSchema),
    async (c) => {
      const { params } = c.req.valid("json");

      const { name, version } = c.get("muppet");
      const specs = c.get("specs");

      const hasTools = McpPrimitives.TOOLS in specs;
      const hasPrompts = McpPrimitives.PROMPTS in specs;
      const hasResources = McpPrimitives.RESOURCES in specs;

      return c.json({
        result: {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(
            params?.protocolVersion,
          )
            ? params.protocolVersion
            : LATEST_PROTOCOL_VERSION,
          serverInfo: {
            name,
            version,
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

  mcp.post("/notifications/:event", (c) => {
    c.get("muppet").events?.emit(
      c,
      `notifications/${c.req.param("event")}` as keyof AvailableEvents,
      undefined,
    );

    return c.body(null, 204);
  });

  mcp.post("/ping", (c) => c.json({ result: {} }));

  const toolsRouter = new Hono<BaseEnv>().use(async (c, next) => {
    if (!(McpPrimitives.TOOLS in c.get("specs"))) {
      throw new Error("No tools available");
    }

    await next();
  });

  toolsRouter.post("/list", (c) =>
    c.json({
      result: {
        tools: Object.values(c.get("specs").tools ?? {}).map(
          ({ path, ...tool }) => tool,
        ),
      },
    }),
  );

  toolsRouter.post(
    "/call",
    sValidator("json", CallToolRequestSchema),
    async (c) => {
      const { params } = c.req.valid("json");

      const path = c.get("specs").tools?.[params.name].path;

      if (!path) {
        throw new Error("Unable to find the path for the tool!");
      }

      const res = await c
        .get("app")
        .request(path, getRequestInit({ message: params.arguments, c }));

      const json = await res.json();

      if (Array.isArray(json))
        return c.json({
          result: { contents: json },
        });

      return c.json({ result: json });
    },
  );

  const promptsRouter = new Hono<BaseEnv>().use(async (c, next) => {
    if (!(McpPrimitives.PROMPTS in c.get("specs"))) {
      throw new Error("No prompts available");
    }

    await next();
  });

  promptsRouter.post("/list", (c) => {
    return c.json({
      result: {
        prompts: Object.values(c.get("specs").prompts ?? {}).map(
          ({ path, ...prompt }) => prompt,
        ),
      },
    });
  });

  promptsRouter.post(
    "/get",
    sValidator("json", GetPromptRequestSchema),
    async (c) => {
      const { params } = c.req.valid("json");

      const prompt = c.get("specs").prompts?.[params.name];

      if (!prompt) {
        throw new Error("Unable to find the path for the tool!");
      }

      const res = await c
        .get("app")
        .request(prompt.path, getRequestInit({ message: params.arguments, c }));

      const json = await res.json();

      if (Array.isArray(json))
        return c.json({
          result: { description: prompt.description, messages: json },
        });

      return c.json({ result: json });
    },
  );

  const resourcesRouter = new Hono<BaseEnv>().use(async (c, next) => {
    if (!(McpPrimitives.RESOURCES in c.get("specs"))) {
      throw new Error("No resources available");
    }

    await next();
  });

  async function findAllTheResources<
    T extends McpResource | McpResourceTemplate,
  >(c: Context<BaseEnv>, mapFn: (resource: Resource) => T | undefined) {
    const responses = await Promise.all(
      Object.values(c.get("specs").resources ?? {}).map(async ({ path }) => {
        const res = await c.get("app").request(path, getRequestInit({ c }));

        return res.json() as Promise<Resource[]>;
      }),
    );

    return responses
      .flat(2)
      .reduce((prev: McpResource[], resource: Resource) => {
        const mapped = mapFn(resource);

        // @ts-expect-error
        if (mapped) prev.push(mapped);

        return prev;
      }, []);
  }

  resourcesRouter.post("/list", async (c) => {
    const resources = await findAllTheResources(c, (resource) => {
      if (resource.type !== "template") {
        return {
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          uri: resource.uri,
        };
      }

      return;
    });

    return c.json({
      result: {
        resources,
      },
    });
  });

  resourcesRouter.post("/templates/list", async (c) => {
    const resources = await findAllTheResources(c, (resource) => {
      if (resource.type === "template") {
        return {
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          uriTemplate: resource.uri,
        };
      }

      return;
    });

    return c.json({
      result: {
        resourceTemplates: resources,
      },
    });
  });

  resourcesRouter.post(
    "/read",
    sValidator("json", ReadResourceRequestSchema),
    async (c) => {
      const { params } = c.req.valid("json");

      const protocol = params.uri.split(":")[0];
      const handler = c.get("muppet").resources?.[protocol];

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

  mcp.route("/tools", toolsRouter);
  mcp.route("/prompts", promptsRouter);
  mcp.route("/resources", resourcesRouter);

  mcp.notFound((c) => {
    c.get("logger")?.info("Method not found");

    return c.json({
      error: {
        code: ErrorCode.MethodNotFound,
        message: "Method not found",
      },
    });
  });

  mcp.onError((err, c) => {
    c.get("logger")?.error({ err }, "Internal error");

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

  return mcp;
}

export async function generateSpecs<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(hono: Hono<E, S, P>) {
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

  const configuration: ServerConfiguration = {};
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

      configuration.resources[path] = {
        path,
      };
    }
  }

  return configuration;
}
