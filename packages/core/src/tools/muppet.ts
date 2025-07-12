import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { BaseContext } from "./context";
import type {
  BlankEnv,
  ClientRequest,
  Env,
  JSONRPCRequest,
  MCPError,
  RouterRoute,
  ServerCapabilities,
  ServerResult,
  ToolHandler,
  ToolMiddlewareHandler,
  ToolOptions,
} from "./types";
import { ErrorCode } from "./utils";

export type MuppetOptions = {
  name: string;
  version: string;
  prefix: string;
};

export type ErrorHandler<E extends Env = any> = (
  err: Error,
  c: BaseContext<E>,
) => void | Promise<void>;

export type NotFoundHandler<E extends Env = any> = (
  c: BaseContext<E>,
) => void | Promise<void>;

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

  tool(
    args1: ToolOptions | ToolHandler<E> | ToolMiddlewareHandler<E>,
    ...args: (ToolHandler<E> | ToolMiddlewareHandler<E>)[]
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
        handler,
      });
    }

    return this;
  }

  async dispatch(
    message: ClientRequest,
    options: { context: BaseContext<E, ClientRequest, ServerResult> },
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

      this.#notFoundHandler(options.context);
    } catch (err) {
      this.#errorHandler(err as Error, options.context);
    }
  }

  async request(
    message: JSONRPCRequest & ClientRequest,
    options?: { env?: E },
  ) {
    const context = new BaseContext(message, {
      env: {
        Variables: {
          ...(options?.env?.Variables ?? {}),
          transport: this.transport,
        },
      },
    });

    const result = await this.dispatch(message, {
      context: context as any,
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
      const response = await this.request(message as any, options);

      if (response) {
        transport.send(response);
      }
    };

    return transport.start();
  }
}
