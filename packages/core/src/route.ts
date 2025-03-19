import type { MiddlewareHandler } from "hono/types";
import type { DescribeToolRouteOptions } from "./types.js";
import { uniqueSymbol } from "./utils.js";

/**
 * Describe a route with OpenAPI specs.
 * @param specs Options for describing a route
 * @returns Middleware handler
 */
export function describeRoute(
  docs: DescribeToolRouteOptions,
): MiddlewareHandler {
  const middleware: MiddlewareHandler = async (_c, next) => {
    await next();
  };

  return Object.assign(middleware, {
    [uniqueSymbol]: {
      resolver: () => docs,
    },
  });
}
