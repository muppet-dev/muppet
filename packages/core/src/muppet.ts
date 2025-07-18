import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { toJsonSchema } from "@standard-community/standard-json";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Context } from "./context";
import type {
  BaseResult,
  BlankEnv,
  ClientNotification,
  ClientRequest,
  CompletionFn,
  Env,
  ErrorHandler,
  H,
  JSONRPCRequest,
  ListPromptsResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ListToolsResult,
  MCPError,
  MiddlewareOptions,
  NotFoundHandler,
  Prompt,
  PromptArgument,
  PromptHandler,
  PromptMiddlewareHandler,
  PromptOptions,
  ResourceHandler,
  ResourceMiddlewareHandler,
  ResourceOptions,
  ResourceTemplateOptions,
  RouterRoute,
  SanitizedPromptOptions,
  SanitizedResourceTemplateOptions,
  SanitizedSimpleResourceOptions,
  SanitizedToolOptions,
  ServerCapabilities,
  ServerResult,
  ToolHandler,
  ToolMiddlewareHandler,
  ToolOptions,
} from "./types";
import { compose, ErrorCode } from "./utils";

export type MuppetOptions = {
  name: string;
  version: string;
  prefix: string;
};

export class Muppet<E extends Env = BlankEnv> {
  name?: string;
  version?: string;
  prefix = "";

  #id!: string;
  routes: RouterRoute = [];
  transport?: Transport;

  #notificationHanler: Map<
    ClientNotification["method"],
    (message: ClientNotification) => void
  > = new Map();

  constructor(options?: Partial<MuppetOptions>) {
    if (options) {
      this.name = options.name;
      this.version = options.version;

      if (options.prefix) {
        this.prefix = options.prefix;
      }
    }
  }

  #notFoundHandler: NotFoundHandler<E> = (ctx) => {
    ctx.error = {
      code: ErrorCode.MethodNotFound,
      message: "Method not found",
    };
  };

  #errorHandler: ErrorHandler<E> = (err: Error, ctx) => {
    ctx.error = {
      code: "code" in err && Number.isSafeInteger(err.code)
        ? Number(err.code)
        : ErrorCode.InternalError,
      message: err.message ?? "Internal error",
      data: "data" in err ? err.data : undefined,
    };
  };

  onError = (handler: ErrorHandler<E>) => {
    this.#errorHandler = handler;
    return this;
  };

  notFound = (handler: NotFoundHandler<E>) => {
    this.#notFoundHandler = handler;
    return this;
  };

  merge(app: Muppet, prefix?: string) {
    const _prefix = prefix ?? app.name;

    let _routes = app.routes;

    if (_prefix && _prefix.length > 0) {
      _routes = _routes.map((route) => ({
        ...route,
        name: `${_prefix}${route.name}`,
      }));
    }

    this.routes.push(..._routes);
    return this;
  }

  tool<
    I extends StandardSchemaV1 = StandardSchemaV1,
    O extends StandardSchemaV1 = StandardSchemaV1,
  >(
    args1:
      | ToolOptions<I, O>
      | ToolHandler<E, I, O>
      | ToolMiddlewareHandler<E, I, O>,
    ...args: (ToolHandler<E, I, O> | ToolMiddlewareHandler<E, I, O>)[]
  ) {
    if (typeof args1 === "object" && !Array.isArray(args1)) {
      this.#id = `${this.prefix}${args1.name}`;
      this.routes.push({
        type: "tool",
        ...args1,
      });
    } else {
      this.routes.push({
        type: "middleware",
        name: this.#id,
        // @ts-expect-error
        handler: args1,
      });
    }

    for (const handler of args) {
      this.routes.push({
        type: "middleware",
        name: this.#id,
        // @ts-expect-error
        handler,
      });
    }

    return this;
  }

  prompt<
    I extends Record<string, StandardSchemaV1> = Record<
      string,
      StandardSchemaV1
    >,
  >(
    args1:
      | PromptOptions<E, I>
      | PromptHandler<E, I>
      | PromptMiddlewareHandler<E, I>,
    ...args: (PromptHandler<E, I> | PromptMiddlewareHandler<E, I>)[]
  ) {
    if (typeof args1 === "object" && !Array.isArray(args1)) {
      this.#id = `${this.prefix}${args1.name}`;
      this.routes.push(
        // @ts-expect-error
        {
          type: "prompt",
          ...args1,
        },
      );
    } else {
      this.routes.push({
        type: "middleware",
        name: this.#id,
        // @ts-expect-error
        handler: args1,
      });
    }

    for (const handler of args) {
      this.routes.push({
        type: "middleware",
        name: this.#id,
        // @ts-expect-error
        handler,
      });
    }

    return this;
  }

  resource<
    I extends Record<string, StandardSchemaV1> = Record<
      string,
      StandardSchemaV1
    >,
  >(
    args1:
      | ResourceOptions<E, I>
      | ResourceHandler<E>
      | ResourceMiddlewareHandler<E>,
    ...args: (ResourceHandler<E> | ResourceMiddlewareHandler<E>)[]
  ) {
    if (typeof args1 === "object" && !Array.isArray(args1)) {
      this.#id = `${this.prefix}${args1.name}`;
      const type = "uriTemplate" in args1 ? "resource-template" : "resource";

      this.routes.push(
        // @ts-expect-error
        {
          ...args1,
          type,
        },
      );
    } else {
      this.routes.push({
        type: "middleware",
        name: this.#id,
        // @ts-expect-error
        handler: args1,
      });
    }

    for (const handler of args) {
      this.routes.push({
        type: "middleware",
        name: this.#id,
        handler,
      });
    }

    return this;
  }

  enable(name: string) {
    const entry = this.routes.find((route) => route.name === name);

    if (entry && entry.type !== "middleware") {
      entry.disabled = false;
    }

    return this;
  }

  disable(name: string) {
    const entry = this.routes.find((route) => route.name === name);

    if (entry && entry.type !== "middleware") {
      entry.disabled = true;
    }

    return this;
  }

  onNotification(
    method: ClientNotification["method"],
    handler: (message: ClientNotification) => void,
  ) {
    this.#notificationHanler.set(method, handler);
    return this;
  }

  async dispatch(
    message: ClientRequest | ClientNotification,
    options: { context: Context<E, ClientRequest, ServerResult> },
  ): Promise<ServerResult | void> {
    try {
      if (message.method === "initialize") {
        if (!this.name || !this.version) {
          throw new Error("Name and version are required for this instance");
        }

        let hasTools = false;
        let hasPrompts = false;
        let hasResources = false;

        for (const route of this.routes) {
          if (route.type === "tool") {
            hasTools = true;
          }

          if (route.type === "prompt") {
            hasPrompts = true;
          }

          if (route.type === "resource" || route.type === "resource-template") {
            hasResources = true;
          }
        }

        const capabilities: ServerCapabilities = {};

        if (hasTools) {
          capabilities.tools = {
            listChanged: true,
          };
        }

        if (hasPrompts) {
          capabilities.prompts = {
            listChanged: true,
          };
        }

        if (hasResources) {
          capabilities.resources = {
            listChanged: true,
          };
        }

        return {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: this.name,
            version: this.version,
          },
          capabilities,
        };
      }

      if (
        message.method === "notifications/cancelled" ||
        message.method === "notifications/progress" ||
        message.method === "notifications/initialized" ||
        message.method === "notifications/roots/list_changed"
      ) {
        const handler = this.#notificationHanler.get(message.method);

        if (handler) {
          handler(message);
        }

        return;
      }

      if (message.method === "ping") {
        return {} satisfies BaseResult;
      }

      if (message.method === "tools/list") {
        const tools: SanitizedToolOptions[] = [];

        for (const route of this.routes) {
          if (route.type === "tool" && route.disabled !== true) {
            tools.push(route);
          }
        }

        return {
          tools: await Promise.all(
            tools.map(async (tool) => {
              const promises = [
                tool.inputSchema ? toJsonSchema(tool.inputSchema) : undefined,
                tool.outputSchema ? toJsonSchema(tool.outputSchema) : undefined,
              ];

              const [inputSchema, outputSchema] = await Promise.all(promises);

              return {
                name: tool.name,
                description: tool.description,
                inputSchema: inputSchema ?? {
                  type: "object",
                  properties: {},
                },
                outputSchema: outputSchema,
                annotations: tool.annotations,
              };
            }),
          ),
        } satisfies ListToolsResult;
      }

      if (message.method === "tools/call") {
        const name = message.params.name;

        let tool: SanitizedToolOptions | undefined;
        const middlewares: H<E>[] = [];

        for (const route of this.routes) {
          if (route.type === "tool" && route.name === name) {
            tool = route;

            if (tool.disabled) {
              options.context.error = {
                code: ErrorCode.InvalidParams,
                message: "Tool is disabled",
              };

              return;
            }
          }

          if (
            route.type === "middleware" &&
            (route.name === name || route.name === "*")
          ) {
            middlewares.push(route.handler);
          }
        }

        if (tool?.inputSchema) {
          const validationResponse = await tool.inputSchema[
            "~standard"
          ].validate(message.params.arguments);

          if (validationResponse.issues) {
            options.context.error = {
              code: ErrorCode.InvalidParams,
              message: "Argument validation failed",
              data: validationResponse.issues,
            };

            return;
          }

          options.context.message = {
            ...message,
            params: {
              ...message.params,
              arguments: validationResponse.value,
            },
          };
        }

        const context = await compose(
          middlewares,
          this.#errorHandler,
          this.#notFoundHandler,
        )(options.context);

        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Result object or `await next()`?",
          );
        }

        return context.result;
      }

      if (message.method === "prompts/list") {
        const prompts: SanitizedPromptOptions[] = [];

        for (const route of this.routes) {
          if (route.type === "prompt" && route.disabled !== true) {
            prompts.push(route);
          }
        }

        return {
          prompts: await Promise.all(
            prompts.map<Promise<Prompt>>(async (prompt) => ({
              name: prompt.name,
              title: prompt.title,
              description: prompt.description,
              arguments: await Promise.all(
                Object.entries(prompt.arguments ?? {}).map<
                  Promise<PromptArgument>
                >(async ([key, value]) => {
                  const jsonSchema = await toJsonSchema(value.validation);

                  return {
                    name: key,
                    description: jsonSchema.description,
                    required: jsonSchema.required?.includes(key) ?? true,
                  };
                }),
              ),
            })),
          ),
        } satisfies ListPromptsResult;
      }

      if (message.method === "prompts/get") {
        const name = message.params.name;

        let prompt: SanitizedPromptOptions | undefined;
        const middlewares: H<E>[] = [];

        for (const route of this.routes) {
          if (route.type === "prompt" && route.name === name) {
            prompt = route;

            if (prompt.disabled) {
              options.context.error = {
                code: ErrorCode.InvalidParams,
                message: "Prompt is disabled",
              };

              return;
            }
          }

          if (
            route.type === "middleware" &&
            (route.name === name || route.name === "*")
          ) {
            middlewares.push(route.handler);
          }
        }

        if (prompt?.arguments) {
          const params: Record<string, unknown> = {};

          for (const [key, value] of Object.entries(prompt.arguments)) {
            const validationResponse = await value.validation[
              "~standard"
            ].validate(message.params.arguments[key]);

            if (validationResponse.issues) {
              options.context.error = {
                code: ErrorCode.InvalidParams,
                message: `Argument validation failed for ${key}`,
                data: validationResponse.issues,
              };

              return;
            }

            params[key] = validationResponse.value;
          }
        }

        const context = await compose(
          middlewares,
          this.#errorHandler,
          this.#notFoundHandler,
        )(options.context);

        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Result object or `await next()`?",
          );
        }

        return context.result;
      }

      if (message.method === "resources/list") {
        const resources: SanitizedSimpleResourceOptions[] = [];

        for (const route of this.routes) {
          if (route.type === "resource" && route.disabled !== true) {
            resources.push(route);
          }
        }

        return {
          resources: resources.map((resource) => ({
            name: resource.name,
            title: resource.title,
            uri: resource.uri,
            description: resource.description,
            mimeType: resource.mimeType,
            _meta: resource._meta,
          })),
        } satisfies ListResourcesResult;
      }

      if (message.method === "resources/templates/list") {
        const resources: SanitizedResourceTemplateOptions[] = [];

        for (const route of this.routes) {
          if (route.type === "resource-template" && route.disabled !== true) {
            resources.push(route);
          }
        }

        return {
          resourceTemplates: resources.map((resource) => ({
            name: resource.name,
            title: resource.title,
            uriTemplate: resource.uriTemplate,
            description: resource.description,
            mimeType: resource.mimeType,
            _meta: resource._meta,
          })),
        } satisfies ListResourceTemplatesResult;
      }

      if (message.method === "resources/read") {
        const resource = this.routes.find(
          (route) =>
            route.type === "resource" && route.uri === message.params.uri,
        );

        let middlewares: MiddlewareOptions["handler"][] = [];
        let variables: Record<string, unknown> = {};

        if (resource) {
          if ("disabled" in resource && resource.disabled) {
            options.context.error = {
              code: ErrorCode.InvalidParams,
              message: "Resource is disabled",
            };

            return;
          }

          for (const route of this.routes) {
            if (
              route.type === "middleware" &&
              (route.name === resource.name || route.name === "*")
            ) {
              middlewares.push(route.handler);
            }
          }
        } else {
          let resourceTemplate: ResourceTemplateOptions | undefined;

          for (const route of this.routes) {
            if (route.type !== "resource-template") continue;

            // This checks if the uriTemplate is a match for the uri
            // Eg - "users:{id}" matches "users:123"
            // Eg - "users.{id}.details" matches "users.123.details"
            const uriTemplate = route.uriTemplate;
            const uri = message.params.uri;

            const match = extractVariables(uriTemplate, uri);

            if (match) {
              resourceTemplate = route;

              if ("disabled" in resourceTemplate && resourceTemplate.disabled) {
                options.context.error = {
                  code: ErrorCode.InvalidParams,
                  message: "Resource is disabled",
                };

                return;
              }

              variables = { ...match };

              if (resourceTemplate.arguments) {
                for (
                  const [key, value] of Object.entries(
                    resourceTemplate.arguments,
                  )
                ) {
                  const validationResponse = await value.validation[
                    "~standard"
                  ].validate(variables[key]);

                  if (validationResponse.issues) {
                    options.context.error = {
                      code: ErrorCode.InvalidParams,
                      message: `Argument validation failed for ${key}`,
                      data: validationResponse.issues,
                    };

                    return;
                  }

                  variables[key] = validationResponse.value;
                }
              }

              break;
            }
          }

          if (resourceTemplate) {
            for (const route of this.routes) {
              if (
                route.type === "middleware" &&
                (route.name === resourceTemplate.name || route.name === "*")
              ) {
                middlewares.push(route.handler);
              }
            }
          }
        }

        if (middlewares.length === 0) {
          options.context.error = {
            code: ErrorCode.InvalidParams,
            message: "Resource not found",
          };

          return;
        }

        if (Object.keys(variables).length > 0) {
          options.context.message = {
            ...message,
            params: {
              ...message.params,
              arguments: variables,
            },
          };
        }

        const context = await compose(
          middlewares,
          this.#errorHandler,
          this.#notFoundHandler,
        )(options.context);

        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Result object or `await next()`?",
          );
        }

        return context.result;
      }

      if (message.method === "completion/complete") {
        let completionFn: CompletionFn<any> | undefined;

        if (message.params.ref.type === "ref/prompt") {
          const promptName = message.params.ref.name;

          const promptOptions = this.routes.find(
            (route) => route.type === "prompt" && route.name === promptName,
          );

          if (promptOptions?.type === "prompt") {
            completionFn = promptOptions.arguments
              ?.[message.params.argument.name]
              ?.completion;
          }
        } else if (message.params.ref.type === "ref/resource") {
          const resourceURI = message.params.ref.uri;

          const resourceOptions = this.routes.find(
            (route) =>
              route.type === "resource-template" &&
              route.uriTemplate === resourceURI,
          );

          if (resourceOptions?.type === "resource-template") {
            completionFn = resourceOptions.arguments
              ?.[message.params.argument.name]
              ?.completion;
          }
        }

        if (!completionFn) {
          options.context.error = {
            code: ErrorCode.InvalidParams,
            message:
              `No completion function found for ${message.params.ref.type}`,
          };

          return;
        }

        const values = await completionFn(
          message.params.argument.value,
          options.context as any,
        );

        if (Array.isArray(values)) {
          return {
            completion: {
              values: values as string[],
              total: values.length,
              hasMore: false,
            },
          };
        }

        return {
          completion: {
            values: values.values as string[],
            total: values.total,
            hasMore: values.hasMore,
          },
        };
      }

      this.#notFoundHandler(options.context);
    } catch (err) {
      this.#errorHandler(err as Error, options.context);
    }
  }

  async request(
    message: JSONRPCRequest & ClientRequest,
    options?: { env?: E },
  ) {
    if (!this.transport) {
      throw new Error(
        "Transport not connected! Call the .connect() method first",
      );
    }

    const context = new Context(message, {
      ...options,
      transport: this.transport,
    });

    const result = await this.dispatch(message, {
      context,
    });

    if (context.error) {
      return {
        id: message.id,
        jsonrpc: "2.0",
        error: context.error,
      } as JSONRPCRequest & { error: MCPError };
    }

    if (!result) {
      return;
    }

    return {
      id: message.id,
      jsonrpc: "2.0",
      result,
    } as JSONRPCRequest & { result: ServerResult };
  }

  async connect(transport: Transport, options?: { env?: E }) {
    this.transport = transport;

    this.transport.onmessage = async (message) => {
      const response = await this.request(
        message as JSONRPCRequest & ClientRequest,
        options,
      );

      if (response) {
        transport.send(response);
      }
    };

    return transport.start();
  }
}

function uriTemplateToRegex(template: string): RegExp {
  // Escape regex special characters except for curly braces
  const escaped = template.replace(/([.+^=!:${}()|[\]/\\])/g, "\\$1");
  // Replace {var} with a capture group
  const pattern = "^" + escaped.replace(/\\{(\w+)\\}/g, "([^/]+)") + "$";
  return new RegExp(pattern);
}

function extractVariables(
  template: string,
  uri: string,
): Record<string, string> | null {
  const varNames = Array.from(template.matchAll(/{(\w+)}/g)).map((m) => m[1]);
  const regex = uriTemplateToRegex(template);
  const match = uri.match(regex);
  if (!match) return null;
  const values = match.slice(1);
  return Object.fromEntries(varNames.map((name, i) => [name, values[i]]));
}
