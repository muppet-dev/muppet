import type { Context } from "./context";
import type {
  Env,
  ErrorHandler,
  H,
  Next,
  NotFoundHandler,
  ServerResult,
} from "./types";

export const ErrorCode = {
  // SDK error codes
  ConnectionClosed: -32000,
  RequestTimeout: -32001,

  // Standard JSON-RPC error codes
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
};

export class McpError extends Error {
  constructor(
    public code: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(`MCP error ${code}: ${message}`);
    this.name = "McpError";
  }
}

export const compose = <E extends Env>(
  middleware: H<E>[],
  onError?: ErrorHandler<E>,
  onNotFound?: NotFoundHandler<E>,
): (context: Context<E>, next?: Next) => Promise<Context<E>> => {
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
    async function dispatch(i: number): Promise<Context<E>> {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;

      let res: ServerResult | undefined | void;
      let isError = false;
      let handler: H<E> | undefined;

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
            await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          await onNotFound(context);
        }
      }

      if (res && (context.finalized === false || isError)) {
        context.result = res;
      }
      return context;
    }
  };
};
