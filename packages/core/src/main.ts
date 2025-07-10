// const METHODS = ["tool", "prompt", "resource"] as const;
// const METHOD_NAME_ALL = "all";

// import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { StandardSchemaV1 } from "@standard-schema/spec";

// const LATEST_PROTOCOL_VERSION = "2024-11-05";
// const SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION];

// type H = any;

// type RouterRoute = {
//   id: any;
//   handler: H;
// };

// export type MuppetOptions = {
//   prefix?: string;
//   name: string;
//   version: string;
// };

// export class Muppet {
//   tool!: any;
//   prompt!: any;
//   resource!: any;
//   use!: any;

//   prefix = "";
//   name!: string;
//   version!: string;

//   #id!: any;

//   // Routes are stored in a record where the key is the method name
//   routes: Record<string, RouterRoute[]> = {};

//   constructor(options: MuppetOptions) {
//     if (options.prefix) {
//       this.prefix = options.prefix;
//     }

//     this.name = options.name;
//     this.version = options.version;

//     for (const method of METHODS) {
//       this[method] = (args1: Record<string, unknown> | H, ...args: H[]) => {
//         if (typeof args1 === "object" && !Array.isArray(args1)) {
//           this.#id = args1;
//         } else {
//           this.#addRoute(method, { name: "*" }, args1);
//         }

//         for (const handler of args) {
//           this.#addRoute(method, this.#id, handler);
//         }

//         return this;
//       };
//     }

//     // Implementation of app.use(...handlers[]) or app.use(id, ...handlers[])
//     this.use = (arg1: string | H, ...handlers: H[]) => {
//       if (typeof arg1 === "string") {
//         this.#id = { name: arg1 };
//       } else {
//         this.#id = { name: "*" };
//         handlers.unshift(arg1);
//       }

//       for (const handler of handlers) {
//         this.#addRoute(METHOD_NAME_ALL, this.#id, handler);
//       }

//       return this;
//     };
//   }

//   #notFoundHandler = () => {};

//   private errorHandler = () => {};

//   merge(app: Muppet) {
//     for (const method of Object.keys(app.routes)) {
//       if (!this.routes[method]) {
//         this.routes[method] = [];
//       }
//       this.routes[method].push(...app.routes[method]);
//     }
//   }

//   #addRoute = (method: string, id: string, handler: H) => {
//     if (!this.routes[method]) {
//       this.routes[method] = [];
//     }

//     this.routes[method].push({ id: `${this.prefix}${id}`, handler });
//   };

//   onError = (handler: any) => {
//     this.errorHandler = handler;
//     return this;
//   };

//   notFound = (handler: any) => {
//     this.#notFoundHandler = handler;
//     return this;
//   };

//   match = (method: string, id: string) => {
//     const routes = this.routes[method] || [];
//     return routes.reduce((acc, route) => {
//       if (route.id.name === id || route.id.name === "*") {
//         acc.push(route.handler);
//       }
//       return acc;
//     }, [] as H[]);
//   };

//   request = (
//     message: Record<string, any>,
//     Env?: Record<string, any>,
//     executionCtx?: Record<string, any>,
//   ) => {
//     if (message.method === "initialize") {
//       return {
//         result: {
//           protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(
//               message?.protocolVersion,
//             )
//             ? message.protocolVersion
//             : LATEST_PROTOCOL_VERSION,
//           serverInfo: {
//             name: this.name,
//             version: this.version,
//           },
//           capabilities: {
//             tools: this.routes.tool ? {} : undefined,
//             prompts: this.routes.prompt ? {} : undefined,
//             resources: this.routes.resource ? {} : undefined,
//           },
//         },
//       };
//     }

//     if (message.method.startsWith("notifications/")) {
//       console.log(message);
//     }

//     if (message.method === "ping") {
//       return { result: {} };
//     }

//     if (message.method === "tools/list") {
//       return {
//         result: {
//           tools: Object.values(this.routes.tool ?? {}).map((route) => {
//           }),
//         },
//       };
//     }

//     return {};
//   };
// }

// const app = new Muppet();

// app.tool(
//   {
//     name: "soemthing-one",
//     description: "This",
//   },
//   async (c, next) => {
//     // Validation logic here
//     // Set the validation result
//     await next();
//   },
//   async (c) => {
//     // Handler logic here
//     return {
//       result: {
//         message: "Hello from something-one",
//       },
//     };
//   },
// )

// --------------
// V2 - Muppet
// --------------

// import type { CompletionFn } from "./types.js";
import { toJsonSchema } from "@standard-community/standard-json";
// import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

// type ToolRoute = {
//   name: string;
//   title?: string;
//   description?: string;
//   inputSchema?: StandardSchemaV1;
// };

// type SanitizedToolRoute = ToolRoute & {
//   type: "tool";
// };

// type PromptRoute = {
//   name: string;
//   description?: string;
//   arguments: {
//     name: string;
//     description?: string;
//     required?: boolean;
//   }[];
// };

// type SanitizedPromptRoute = PromptRoute & {
//   type: "prompt";
// };

// type StaticResourceRoute = {
//   name: string;
//   description?: string;
//   mimeType?: string;
//   uri: string;
// };

// type SanitizedStaticResourceRoute = StaticResourceRoute & {
//   type: "resource";
// };

// type TemplateResourceRoute = {
//   name: string;
//   description?: string;
//   mimeType?: string;
//   uri: string;
//   completion?: CompletionFn;
// };

// type SanitizedTemplateResourceRoute = TemplateResourceRoute & {
//   type: "resource";
// };

// type H = any;

// type MiddlewareRoute = {
//   type: "middleware";
//   name: string;
//   handler: H;
// };

// type RouterRoute = (
//   | SanitizedToolRoute
//   | SanitizedPromptRoute
//   | SanitizedStaticResourceRoute
//   | SanitizedTemplateResourceRoute
//   | MiddlewareRoute
// )[];

// type MuppetOptions = {
//   name: string;
//   version: string;
//   prefix: string;
// };

// type MethodProps = {
//   tool: ToolRoute;
//   prompt: PromptRoute;
//   resource: StaticResourceRoute | TemplateResourceRoute;
// };

// const METHODS = ["tool", "prompt", "resource"] as const;

// export class Muppet {
//   name?: string;
//   version?: string;
//   prefix = "";

//   tool!: any;
//   prompt!: any;
//   resource!: any;
//   use!: any;

//   #id!: string;
//   routes: RouterRoute = [];
//   transport!: Transport;

//   constructor(options: Partial<MuppetOptions>) {
//     this.name = options.name;
//     this.version = options.version;

//     if (options.prefix) {
//       this.prefix = options.prefix;
//     }

//     for (const method of METHODS) {
//       this[method] = (args1: MethodProps[typeof method] | H, ...args: H[]) => {
//         if (typeof args1 === "object" && !Array.isArray(args1)) {
//           this.#id = `${this.prefix}${args1.name}`;
//           this.routes.push({
//             type: method,
//             ...args1,
//           });
//         } else {
//           this.routes.push({
//             type: "middleware",
//             name: this.#id,
//             handler: args1,
//           });
//         }

//         for (const handler of args) {
//           this.routes.push({
//             type: "middleware",
//             name: this.#id,
//             handler,
//           });
//         }

//         return this;
//       };
//     }

//     this.use = (arg1: string | H, ...handlers: H[]) => {
//       if (typeof arg1 === "string") {
//         this.#id = `${this.prefix}${arg1}`;
//       } else {
//         this.routes.push({
//           type: "middleware",
//           name: this.#id,
//           handler: arg1,
//         });
//       }

//       for (const handler of handlers) {
//         this.routes.push({
//           type: "middleware",
//           name: this.#id,
//           handler,
//         });
//       }

//       return this;
//     };
//   }

//   #notFoundHandler = () => {
//     return {
//       error: {
//         code: -32601,
//         message: "Method not found",
//       },
//     };
//   };

//   private errorHandler = (err: Error) => {
//     return {
//       error: {
//         code: "code" in err && Number.isSafeInteger(err.code)
//           ? err.code
//           : -32603,
//         message: err.message ?? "Internal error",
//       },
//     };
//   };

//   onError = (handler: any) => {
//     this.errorHandler = handler;
//     return this;
//   };

//   notFound = (handler: any) => {
//     this.#notFoundHandler = handler;
//     return this;
//   };

//   merge(app: Muppet, prefix?: string) {
//     const _prefix = prefix ?? app.name;

//     let _routes = app.routes;

//     if (_prefix && _prefix.length > 0) {
//       _routes = _routes.map((route) => ({
//         ...route,
//         name: `${_prefix}${route.name}`,
//       }));
//     }

//     this.routes.push(..._routes);
//     return this;
//   }

//   async request(message: Record<string, any>) {
//     try {
//       if (message.method === "initialize") {
//         if (!this.name || !this.version) {
//           throw new Error("Name and version are required for this instance");
//         }

//         return {
//           result: {
//             protocolVersion: "2024-11-05",
//             serverInfo: {
//               name: this.name,
//               version: this.version,
//             },
//             capabilities: {
//               tools: {},
//             },
//           },
//         };
//       }

//       if (message.method.startsWith("notifications/")) {
//         console.log("Notification -", message);
//         return;
//       }

//       if (message.method === "ping") {
//         return { result: {} };
//       }

//       if (message.method === "tools/list") {
//         const tools = [];

//         for (const route of this.routes) {
//           if (route.type === "tool") {
//             tools.push({
//               name: route.name,
//               description: route.description,
//               inputSchema: route.inputSchema
//                 ? await toJsonSchema(route.inputSchema)
//                 : undefined,
//             });
//           }
//         }

//         return {
//           result: {
//             tools,
//           },
//         };
//       }

//       if (message.method === "tools/call") {
//         const name = message.params.name;

//         const middlewares: H[] = [];

//         for (const route of this.routes) {
//           if (route.type === "middleware" && route.name === name) {
//             middlewares.push(route.handler);
//           }
//         }

//         const c = new Context(message);

//         const composed = compose(middlewares);

//         const context = await composed(c);

//         if (!context.finalized) {
//           throw new Error(
//             "Context is not finalized. Did you forget to return a Response object or `await next()`?",
//           );
//         }

//         return {
//           result: context.res,
//         };
//       }

//       if (message.method === "prompts/list") {
//         const prompts = [];

//         for (const route of this.routes) {
//           if (route.type === "prompt") {
//             prompts.push({
//               name: route.name,
//               description: route.description,
//               arguments: route.arguments,
//             });
//           }
//         }

//         return {
//           result: {
//             prompts,
//           },
//         };
//       }

//       if (message.method === "prompts/get") {
//         return {
//           result: {},
//         };
//       }

//       if (message.method === "resources/list") {
//         const resources = [];

//         for (const route of this.routes) {
//           if (route.type === "resource" && !route.uri.includes(":")) {
//             resources.push({
//               name: route.name,
//               description: route.description,
//               mimeType: route.mimeType,
//               uri: route.uri,
//             });
//           }
//         }

//         return {
//           result: {
//             resources,
//           },
//         };
//       }

//       if (message.method === "resources/templates/list") {
//         const resourceTemplates = [];

//         for (const route of this.routes) {
//           if (route.type === "resource" && route.uri.includes(":")) {
//             resourceTemplates.push(route);
//           }
//         }

//         return {
//           result: {
//             resourceTemplates,
//           },
//         };
//       }

//       if (message.method === "resources/read") {
//         return {
//           result: {},
//         };
//       }

//       if (message.method === "completion/complete") {
//         return {
//           result: {},
//         };
//       }

//       return this.#notFoundHandler();
//     } catch (err) {
//       return this.errorHandler(err as Error);
//     }
//   }

//   connect(transport: Transport) {
//     this.transport = transport;

//     this.transport.onmessage = async (message) => {
//       console.log("Message - ", message);
//       const result = await this.request(message);

//       if (result) {
//         this.transport.send({
//           // @ts-expect-error
//           id: message.id,
//           jsonrpc: "2.0",
//           ...result,
//         } as any);
//       }
//     };

//     return transport.start();
//   }
// }

// type ContextOptions = {
//   env: Record<string, any>;
// };

// export class Context {
//   message: Record<string, any>;
//   env: Record<string, any> = {};
//   #var: Map<unknown, unknown> | undefined;
//   finalized = false;
//   error: Error | undefined;
//   #res: Response | undefined;

//   constructor(message: Record<string, any>, options?: ContextOptions) {
//     this.message = message;

//     if (options) {
//       this.env = options.env;
//     }
//   }

//   get res() {
//     return this.#res;
//   }

//   set res(_res: Response | undefined) {
//     if (this.#res && _res) {
//       _res = new Response(_res.body, _res);

//       this.#res.headers.forEach((v, k) => {
//         if (k === "set-cookie") {
//           const cookies = this.#res?.headers.getSetCookie() ?? [];
//           // @ts-expect-error
//           _res.headers.delete("set-cookie");
//           for (const cookie of cookies) {
//             // @ts-expect-error
//             _res.headers.append("set-cookie", cookie);
//           }
//         } else if (k !== "content-type") {
//           // @ts-expect-error
//           _res.headers.set(k, v);
//         }
//       });
//     }
//     this.#res = _res;
//     this.finalized = true;
//   }

//   set = (key: string, value: unknown) => {
//     this.#var ??= new Map();
//     this.#var.set(key, value);
//   };

//   get = (key: string) => {
//     return this.#var ? this.#var.get(key) : undefined;
//   };

//   get var(): Readonly<any> {
//     if (!this.#var) {
//       return {} as any;
//     }
//     return Object.fromEntries(this.#var);
//   }
// }

export const compose = (
  middleware: H<any, any>[],
  onError?: any,
  onNotFound?: any,
): (context: Context, next?: any) => Promise<Context> => {
  return (context, next) => {
    let index = -1;

    return dispatch(0);

    /**
     * Dispatch the middleware functions.
     *
     * @param {number} i - The current index in the middleware array.
     *
     * @returns {Promise<Context>} - A promise that resolves to the context.
     */
    async function dispatch(i: number): Promise<Context> {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;

      let res: Result | undefined;
      let isError = false;
      let handler: H<any, any> | undefined;

      if (middleware[i]) {
        handler = middleware[i];
      } else {
        handler = (i === middleware.length && next) || undefined;
      }

      if (handler) {
        try {
          // @ts-expect-error
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }

      if (res && (context.finalized === false || isError)) {
        context.result = res;
      }
      return context;
    }
  };
};

// --------------
// V3 - Muppet
// --------------

export type Variables = object;

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type BlankEnv = {};
export type Env = {
  Variables?: Variables;
};

type CallToolRequest<T extends StandardSchemaV1 = StandardSchemaV1> = {
  method: "tools/call";
  params: {
    name: string;
    arguments: StandardSchemaV1.InferOutput<T>;
    _meta?: Record<string, unknown>;
  };
};

type Message = CallToolRequest;

export type Next = () => Promise<void>;

export type Result = Record<string, unknown>;

export type ErrorHandler<E extends Env = any> = (
  err: Error,
  c: Context<E>,
) => Result | Promise<Result>;

export type NotFoundHandler<E extends Env = any> = (
  c: Context<E>,
) => Result | Promise<Result>;

type ToolHandler<
  T extends StandardSchemaV1,
  E extends Env = any,
> = (
  c: Context<E, CallToolRequest<T>>,
  next: Next,
) => Result | Promise<Result>;
type ToolMiddlewareHandler<
  T extends StandardSchemaV1,
  E extends Env = any,
> = (
  c: Context<E, CallToolRequest<T>>,
  next: Next,
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
) => Promise<Result | void>;

type H<
  T extends StandardSchemaV1,
  E extends Env = any,
> = ToolHandler<T, E> | ToolMiddlewareHandler<T, E>;

type ToolRoute<T extends StandardSchemaV1 = StandardSchemaV1> = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: T;
};

type SanitizedToolRoute = ToolRoute & {
  type: "tool";
};

type MiddlewareRoute = {
  type: "middleware";
  name: string;
  handler: H<any, any>;
};

type RouterRoute = (SanitizedToolRoute | MiddlewareRoute)[];

export type MuppetOptions = {
  name: string;
  version: string;
  prefix: string;
};

export class Muppet<E extends Env = Env> {
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

  #notFoundHandler: NotFoundHandler<E> = () => {
    return {
      error: {
        code: -32601,
        message: "Method not found",
      },
    };
  };

  private errorHandler: ErrorHandler<E> = (err: Error) => {
    return {
      error: {
        code: "code" in err && Number.isSafeInteger(err.code)
          ? err.code
          : -32603,
        message: err.message ?? "Internal error",
      },
    };
  };

  onError = (handler: ErrorHandler<E>) => {
    this.errorHandler = handler;
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

  tool<T extends StandardSchemaV1>(
    args1: ToolRoute<T> | H<T, E>,
    ...args: H<T, E>[]
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

  async request(message: Message, env?: E) {
    const context = new Context(message, { env });
    try {
      // @ts-expect-error
      if (message.method === "initialize") {
        if (!this.name || !this.version) {
          throw new Error("Name and version are required for this instance");
        }

        return {
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: this.name,
              version: this.version,
            },
            capabilities: {
              tools: {},
            },
          },
        };
      }

      if (message.method.startsWith("notifications/")) {
        console.log("Notification -", message);
        return;
      }

      // @ts-expect-error
      if (message.method === "ping") {
        return { result: {} };
      }

      // @ts-expect-error
      if (message.method === "tools/list") {
        const tools = [];

        for (const route of this.routes) {
          if (route.type === "tool") {
            tools.push({
              name: route.name,
              description: route.description,
              inputSchema: route.inputSchema
                ? await toJsonSchema(route.inputSchema)
                : undefined,
            });
          }
        }

        return {
          result: {
            tools,
          },
        };
      }

      if (message.method === "tools/call") {
        const name = message.params.name;

        const middlewares: H<any, any>[] = [];

        for (const route of this.routes) {
          if (route.type === "middleware" && route.name === name) {
            middlewares.push(route.handler);
          }
        }

        const c = new Context(message);

        const composed = compose(middlewares);

        const context = await composed(c);

        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?",
          );
        }

        return {
          result: context.result,
        };
      }

      return this.#notFoundHandler(context);
    } catch (err) {
      return this.errorHandler(err as Error, context);
    }
  }

  connect(transport: Transport) {
    this.transport = transport;

    this.transport.onmessage = async (message) => {
      console.log("Message - ", message);
      // @ts-expect-error
      const result = await this.request(message);

      if (result) {
        this.transport.send({
          // @ts-expect-error
          id: message.id,
          jsonrpc: "2.0",
          ...result,
        } as any);
      }
    };

    return transport.start();
  }
}

/**
 * Interface for getting context variables.
 *
 * @template E - Environment type.
 */
type Get<E extends Env> = <Key extends keyof E["Variables"]>(
  key: Key,
) => E["Variables"][Key];

/**
 * Interface for setting context variables.
 *
 * @template E - Environment type.
 */
type Set<E extends Env> = <Key extends keyof E["Variables"]>(
  key: Key,
  value: E["Variables"][Key],
) => void;

export class Context<E extends Env = Env, M extends Message = any> {
  #var: Map<unknown, unknown> | undefined;
  finalized = false;
  error: Error | undefined;
  #result: Result | undefined;

  constructor(public message: M, options?: { env?: E }) {
    if (options?.env) {
      this.#var = new Map(Object.entries(options.env.Variables ?? {}));
    }
  }

  get result() {
    return this.#result;
  }

  set result(_result: Result | undefined) {
    this.#result = _result;
    this.finalized = true;
  }

  set: Set<E> = (key, value) => {
    this.#var ??= new Map();
    this.#var.set(key, value);
  };

  get: Get<E> = (key) => {
    return (this.#var ? this.#var.get(key) : undefined) as E["Variables"][
      typeof key
    ];
  };

  get var(): Readonly<any> {
    if (!this.#var) {
      return {} as any;
    }
    return Object.fromEntries(this.#var);
  }
}
