import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { toJsonSchema } from "@standard-community/standard-json";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Context } from "./context";
import type {
  BaseResult,
  BlankEnv,
  ClientRequest,
  Env,
  ErrorHandler,
  H,
  JSONRPCRequest,
  ListToolsResult,
  MCPError,
  NotFoundHandler,
  RouterRoute,
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
        const hasToolsListChanged = false;

        for (const route of this.routes) {
          if (route.type === "tool") {
            hasTools = true;
          }
        }

        const capabilities: ServerCapabilities = {};

        if (hasTools) {
          capabilities.tools = {};

          if (hasToolsListChanged) {
            capabilities.tools.listChanged = true;
          }
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
          tools: await Promise.all(tools.map(async (tool) => {
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
          })),
        } satisfies ListToolsResult;
      }

      if (message.method === "tools/call") {
        const name = message.params.name;

        const middlewares: H<E>[] = [];

        for (const route of this.routes) {
          if (
            route.type === "middleware" &&
            (route.name === name || route.name === "*")
          ) {
            middlewares.push(route.handler);
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
