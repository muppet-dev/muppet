import type { MiddlewareHandler } from "hono/types";
import type { DescribeOptions } from "./types.js";
import {
  McpPrimitives,
  type McpPrimitivesValue,
  uniqueSymbol,
} from "./utils.js";

function describeRoute(type: McpPrimitivesValue) {
  return (docs: DescribeOptions = {}): MiddlewareHandler => {
    const middleware: MiddlewareHandler = async (_c, next) => {
      await next();
    };

    return Object.assign(middleware, {
      [uniqueSymbol]: {
        toJson: docs,
        type,
      },
    });
  };
}

/**
 * Describe prompt's name and description
 */
export const describePrompt = describeRoute(McpPrimitives.PROMPTS);

/**
 * Describe tool's name and description
 */
export const describeTool = describeRoute(McpPrimitives.TOOLS);
