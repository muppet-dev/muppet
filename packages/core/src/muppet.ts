import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { toJsonSchema } from "@standard-community/standard-json";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { I, O } from "vitest/dist/chunks/reporters.d.CqBhtcTq.js";
import { z } from "zod";
import { Context } from "./context";
import type {
  BaseResult,
  BlankEnv,
  ClientRequest,
  Env,
  ErrorHandler,
  H,
  JSONRPCRequest,
  ListPromptsResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ListToolsResult,
  MCPError,
  NotFoundHandler,
  Prompt,
  PromptArgument,
  PromptHandler,
  PromptMiddlewareHandler,
  PromptOptions,
  Resource,
  ResourceHandler,
  ResourceMiddlewareHandler,
  ResourceOptions,
  ResourceTemplate,
  RouterRoute,
  SanitizedResourceOptions,
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
  transport!: Transport;

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

  resource(
    args1: ResourceOptions | ResourceHandler<E> | ResourceMiddlewareHandler<E>,
    ...args: (ResourceHandler<E> | ResourceMiddlewareHandler<E>)[]
  ) {
    if (typeof args1 === "object" && !Array.isArray(args1)) {
      this.#id = `${this.prefix}${args1.name}`;
      const type = "uriTemplate" in args1 ? "resource-template" : "resource";

      this.routes.push(
        // @ts-expect-error
        {
          type,
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
        handler,
      });
    }

    return this;
  }

  async dispatch(
    message: ClientRequest,
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

      if (message.method === "ping") {
        return {} satisfies BaseResult;
      }

      if (message.method === "tools/list") {
        const tools = this.routes.filter((route) => route.type === "tool");

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
            "Context is not finalized. Did you forget to return a Response object or `await next()`?",
          );
        }

        return context.result;
      }

      if (message.method === "prompts/list") {
        const prompts: PromptOptions[] = this.routes.filter(
          (route) => route.type === "prompt",
        );

        return {
          prompts: await Promise.all(
            prompts.map<Promise<Prompt>>(async (prompt) => {
              return {
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
                      required: jsonSchema.required?.includes(key),
                    };
                  }),
                ),
              };
            }),
          ),
        } satisfies ListPromptsResult;
      }

      if (message.method === "prompts/get") {
        const name = message.params.name;

        let prompt: PromptOptions | undefined;
        const middlewares: H<E>[] = [];

        for (const route of this.routes) {
          if (route.type === "prompt" && route.name === name) {
            prompt = route;
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
            "Context is not finalized. Did you forget to return a Response object or `await next()`?",
          );
        }

        return context.result;
      }

      if (message.method === "resources/list") {
        const resources: Resource[] = this.routes.filter(
          (route) => route.type === "resource",
        );

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
        const resources: ResourceTemplate[] = this.routes.filter(
          (route) => route.type === "resource-template",
        );

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
        // TODO: Implement
        return;
      }

      if (message.method === "completion/complete") {
        // TODO: Implement
        return;
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

const mcp = new Muppet();

mcp.prompt(
  {
    name: "get-prompt",
    description: "Get a prompt",
    arguments: {
      prompt: {
        validation: z.string(),
        completion: async (value, ctx) => {
          return ["Aditya"];
        },
      },
    },
  },
  async (ctx, next) => {
    ctx.message.params.arguments;
    await next();
  },
  async (ctx, next) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Hello, world!",
          },
        },
      ],
    };
  },
);
