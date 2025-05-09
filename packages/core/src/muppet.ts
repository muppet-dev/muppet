import { sValidator } from "@hono/standard-validator";
import {
  CallToolRequestSchema,
  CompleteRequestSchema,
  ErrorCode,
  GetPromptRequestSchema,
  InitializeRequestSchema,
  LATEST_PROTOCOL_VERSION,
  ReadResourceRequestSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "@modelcontextprotocol/sdk/types.js";
import { Hono, type Context } from "hono";
import type {
  BlankEnv,
  BlankSchema,
  Env,
  Input,
  Schema,
  ValidationTargets,
} from "hono/types";
import type { JSONSchema7 } from "json-schema";
import type {
  ClientToServerNotifications,
  BaseEnv,
  CompletionFn,
  ConceptConfiguration,
  CreateMuppetOptions,
  DescribeOptions,
  MuppetConfiguration,
  PromptConfiguration,
  Resource,
  ServerConfiguration,
  ToolHandlerResponse,
} from "./types";
import { McpPrimitives, uniqueSymbol } from "./utils";

export async function muppet<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(hono: Hono<E, S, P>, config: MuppetConfiguration) {
  const specs = await generateSpecs(hono, config.symbols);

  return createMuppetServer({
    config,
    specs,
    app: hono,
  });
}

export function createMuppetServer<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(options: CreateMuppetOptions<E, S, P>): Hono<BaseEnv<E, S, P>> {
  const { config, specs, app } = options;

  /**
   * Tools router
   */
  const toolsRouter = new Hono<BaseEnv<E, S, P>>()
    .use(async (c, next) => {
      if (!(McpPrimitives.TOOLS in c.get("specs"))) {
        throw new Error("No tools available");
      }

      await next();
    })
    .post("/list", (c) =>
      c.json({
        result: {
          tools: Object.values(c.get("specs").tools ?? {}).map(
            ({ name, description, inputSchema }) => ({
              name,
              description,
              inputSchema,
            }),
          ),
        },
      }),
    )
    .post("/call", sValidator("json", CallToolRequestSchema), async (c) => {
      const { params } = c.req.valid("json");

      const _tool = c.get("specs").tools?.[params.name];

      if (!_tool) {
        throw new Error("Unable to find the path for the tool!");
      }

      const res = await c.get("app").request(
        ...getRequestInit({
          path: _tool.path,
          method: _tool.method,
          schema: _tool.schema,
          args: params.arguments,
        }),
        createMuppetEnv(c),
      );

      const json = await res.json();

      if (_tool.resourceType === "text") {
        return c.json({
          result: {
            content: [
              {
                type: "text",
                text: typeof json === "string" ? json : JSON.stringify(json),
              },
            ],
          },
        });
      }

      if (Array.isArray(json))
        return c.json({
          result: { content: json },
        });

      return c.json({ result: json });
    });

  /**
   * Prompt Router
   */
  const promptsRouter = new Hono<BaseEnv<E, S, P>>()
    .use(async (c, next) => {
      if (!(McpPrimitives.PROMPTS in c.get("specs"))) {
        throw new Error("No prompts available");
      }

      await next();
    })
    .post("/list", (c) => {
      return c.json({
        result: {
          prompts: Object.values(c.get("specs").prompts ?? {}).map(
            ({ path, ...prompt }) => prompt,
          ),
        },
      });
    })
    .post("/get", sValidator("json", GetPromptRequestSchema), async (c) => {
      const { params } = c.req.valid("json");

      const prompt = c.get("specs").prompts?.[params.name];

      if (!prompt) {
        throw new Error("Unable to find the path for the prompt!");
      }

      const res = await c.get("app").request(
        ...getRequestInit({
          path: prompt.path,
          method: prompt.method,
          schema: prompt.schema,
          args: params.arguments,
        }),
        createMuppetEnv(c),
      );

      const json = await res.json();

      if (Array.isArray(json))
        return c.json({
          result: { description: prompt.description, messages: json },
        });

      return c.json({ result: json });
    });

  /**
   * Resource Router
   */
  const resourcesRouter = new Hono<BaseEnv<E, S, P>>()
    .use(async (c, next) => {
      if (!(McpPrimitives.RESOURCES in c.get("specs"))) {
        throw new Error("No resources available");
      }

      await next();
    })
    .post("/list", async (c) => {
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
    })
    .post("/templates/list", async (c) => {
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
    })
    .post("/read", sValidator("json", ReadResourceRequestSchema), async (c) => {
      const { params } = c.req.valid("json");

      const protocol = params.uri.split(":")[0];
      const handler = c.get("muppet").resources?.[protocol];

      if (!handler) {
        throw new Error(`Unable to find the handler for ${protocol} protocol!`);
      }

      const contents = await handler(params.uri);

      if (Array.isArray(contents))
        return c.json({
          result: { contents },
        });

      return c.json({ result: contents });
    });

  return new Hono<BaseEnv<E, S, P>>()
    .use(async (c, next) => {
      config.logger?.info(
        { method: c.req.method, path: c.req.path },
        "Incoming request",
      );

      c.set("muppet", config);
      c.set("specs", specs);
      c.set("app", app);

      await next();

      config.logger?.info({ status: c.res.status }, "Outgoing response");
    })
    .post(
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
    )
    .post("/notifications/:event", (c) => {
      c.get("muppet").events?.emit(
        c,
        `notifications/${c.req.param("event")}` as keyof ClientToServerNotifications,
        undefined,
      );

      return c.body(null, 204);
    })
    .post("/ping", (c) => c.json({ result: {} }))
    .route("/tools", toolsRouter)
    .route("/prompts", promptsRouter)
    .route("/resources", resourcesRouter)
    .post(
      "/completion/complete",
      sValidator("json", CompleteRequestSchema),
      async (c) => {
        const { params } = c.req.valid("json");

        let completionFn: CompletionFn | undefined;

        if (params.ref.type === "ref/prompt") {
          completionFn = c.get("specs").prompts?.[params.ref.name].completion;
        } else if (params.ref.type === "ref/resource") {
          completionFn = await findAllTheResources(c, (resource) => {
            if (
              resource.type === "template" &&
              resource.uri === params.ref.uri
            ) {
              return resource.completion;
            }

            return;
          }).then((res) => res[0]);
        }

        if (!completionFn)
          return c.json({
            result: {
              completion: {
                values: [],
                total: 0,
                hasMore: false,
              },
            },
          });

        const values = await completionFn(params.argument);

        if (Array.isArray(values)) {
          return c.json({
            result: {
              completion: {
                values,
                total: values.length,
                hasMore: false,
              },
            },
          });
        }

        return c.json({ result: { completion: values } });
      },
    )
    .notFound((c) => {
      c.get("muppet").logger?.info("Method not found");

      return c.json({
        error: {
          code: ErrorCode.MethodNotFound,
          message: "Method not found",
        },
      });
    })
    .onError((err, c) => {
      c.get("muppet").logger?.error({ err }, "Internal error");

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
}

export async function generateSpecs<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(hono: Hono<E, S, P>, symbols: unknown[] = []) {
  const concepts: ConceptConfiguration = {};

  // biome-ignore lint/suspicious/noExplicitAny: Need this for the type
  const _symbols: any[] = [...symbols, uniqueSymbol];

  for (const route of hono.routes) {
    const uSymbol = _symbols.find((symbol) => symbol in route.handler);

    if (!uSymbol) continue;

    // @ts-expect-error
    const { validationTarget, toJson, type } = route.handler[
      uSymbol
    ] as ToolHandlerResponse;

    let result: DescribeOptions | JSONSchema7;

    if (typeof toJson === "function") {
      result = await toJson();
    } else {
      result = toJson ?? {};
    }

    const concept = concepts[route.path]?.[route.method];

    if (concept?.type && type && concept.type !== type) {
      throw new Error(
        `Conflicting types for ${route.path}: ${concept.type} and ${type}`,
      );
    }

    let payload: Record<string, unknown> = {
      ...(concept ?? {}),
      type: type ?? concept?.type,
    };

    if (validationTarget && "schema" in result) {
      payload.schema = {
        ...(payload.schema ?? {}),
        [validationTarget]: result.schema,
      };
    } else {
      payload = {
        ...payload,
        ...result,
      };
    }

    concepts[route.path] = {
      ...(concepts[route.path] ?? {}),
      [route.method]: payload,
    };
  }

  const configuration: ServerConfiguration = {};
  for (const [path, conceptByMethod] of Object.entries(concepts)) {
    if (!conceptByMethod) continue;

    for (const [method, concept] of Object.entries(conceptByMethod)) {
      if (!concept) continue;

      if (!concept.type) {
        throw new Error(`Type not found for ${path}`);
      }

      if (concept.type === McpPrimitives.TOOLS) {
        if (!configuration.tools) {
          configuration.tools = {};
        }

        const key = concept.name ?? generateKey(method, path);

        configuration.tools[key] = {
          name: key,
          description: concept.description,
          resourceType: concept.resourceType,
          inputSchema: mergeSchemas(concept.schema) ?? {},
          path,
          method,
          schema: concept.schema,
        };
      } else if (concept.type === McpPrimitives.PROMPTS) {
        if (!configuration.prompts) {
          configuration.prompts = {};
        }

        const key = concept.name ?? generateKey(method, path);

        const args: PromptConfiguration[string]["arguments"] = [];
        const meragedSchema = mergeSchemas(concept.schema) ?? {};

        for (const arg of Object.keys(meragedSchema.properties ?? {})) {
          args.push({
            name: arg,
            // @ts-expect-error
            description: meragedSchema.properties?.[arg]?.description,
            required: meragedSchema.required?.includes(arg) ?? false,
          });
        }

        configuration.prompts[key] = {
          name: key,
          description: concept.description,
          completion: concept.completion,
          arguments: args,
          path,
          method,
          schema: concept.schema,
        };
      } else if (concept.type === McpPrimitives.RESOURCES) {
        if (!configuration.resources) {
          configuration.resources = {};
        }

        configuration.resources[generateKey(method, path)] = {
          path,
          method,
        };
      }
    }
  }

  return configuration;
}

export function mergeSchemas(
  schema?: { [K in keyof ValidationTargets]?: JSONSchema7 },
) {
  let tmp: JSONSchema7 | undefined = undefined;

  for (const sch of Object.values(schema ?? {})) {
    if (!tmp) {
      tmp = sch;
      continue;
    }

    tmp = {
      ...tmp,
      properties: {
        ...tmp.properties,
        ...sch.properties,
      },
      required: [...(tmp.required ?? []), ...(sch.required ?? [])],
    };
  }

  return tmp;
}

async function findAllTheResources<
  T,
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(c: Context<BaseEnv<E, S, P>>, mapFn: (resource: Resource) => T | undefined) {
  const responses = await Promise.all(
    Object.values(c.get("specs").resources ?? {}).map(
      async ({ path, method }) =>
        // @ts-expect-error
        c.get("app").request(path, {
          method,
          headers: c.req.header(),
        }) as Promise<Resource[]>,
    ),
  );

  return responses.flat(2).reduce((prev: T[], resource: Resource) => {
    const mapped = mapFn(resource);

    if (mapped) prev.push(mapped);

    return prev;
  }, []);
}

export function generateKey(method: string, path: string) {
  return `${method}:${path}`;
}

type GetRequestInitOptions = {
  path: string;
  method: string;
  schema?: {
    [K in keyof ValidationTargets]?: JSONSchema7;
  };
  args?: Record<string, unknown>;
};

function getRequestInit(options: GetRequestInitOptions): [string, RequestInit] {
  const { path, method, schema, args } = options;

  const targetProps: {
    [K in keyof ValidationTargets]?: Record<string, unknown>;
  } = {};
  const reqInit: RequestInit = {
    method,
  };

  for (const [target, { properties }] of Object.entries(schema ?? {}) as [
    keyof ValidationTargets,
    JSONSchema7,
  ][]) {
    if (!properties) continue;

    targetProps[target] = Object.keys(properties).reduce<
      Record<string, unknown>
    >((prev, key) => {
      if (args?.[key] !== undefined) prev[key] = args?.[key];
      return prev;
    }, {});
  }

  if (Object.values(targetProps.header ?? {}).length > 0) {
    reqInit.headers = targetProps.header as Record<string, string>;
  }
  if (Object.values(targetProps.json ?? {}).length > 0) {
    reqInit.body = JSON.stringify(targetProps.json);
    reqInit.headers = {
      ...reqInit.headers,
      "content-type": "application/json",
    };
  }

  // Handle query params
  const queryString = querySerializer(targetProps.query);
  const pathWithParams = placeParamValues(path, targetProps.param);

  return [
    `${pathWithParams}${queryString.length > 0 ? `?${queryString}` : ""}`,
    reqInit,
  ];
}

function placeParamValues(path: string, params?: Record<string, unknown>) {
  return path
    .split("/")
    .map((x) => {
      let tmp = x;
      if (tmp.startsWith(":")) {
        const match = tmp.match(/^:([^{?]+)(?:{(.+)})?(\?)?$/);
        if (match) {
          const paramName = match[1];
          const value = params?.[paramName];

          if (value) tmp = String(value);
        } else {
          tmp = tmp.slice(1, tmp.length);
          if (tmp.endsWith("?")) tmp = tmp.slice(0, -1);
        }
      }

      return tmp;
    })
    .join("/");
}

type QuerySerializerOptions = {
  prefix?: string;
  separator?: string;
};

function querySerializer(
  query?: Record<string, unknown>,
  options?: QuerySerializerOptions,
) {
  const { prefix, separator = "__" } = options ?? {};

  return Object.entries(query ?? {})
    .reduce<string[]>((prev, [key, value]) => {
      const uniqueKey = `${prefix ? `${prefix}${separator}` : ""}${key}`;
      if (value) {
        if (Array.isArray(value))
          prev.push(
            ...value
              .filter((val) => val !== undefined)
              .map((val) => `${uniqueKey}=${val}`),
          );
        else if (typeof value === "object")
          prev.push(
            querySerializer(value as Record<string, unknown>, {
              prefix: uniqueKey,
              separator,
            }),
          );
        else prev.push(`${uniqueKey}=${value}`);
      }

      return prev;
    }, [])
    .join("&");
}

function createMuppetEnv<E extends Env, P extends string, I extends Input>(
  c: Context<E, P, I>,
) {
  return {
    ...c.env,
    muppet: {
      req: c.req,
    },
  };
}
