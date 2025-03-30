import type { MiddlewareHandler } from "hono/types";
import type { CompletionFn, DescribeOptions } from "./types.js";
import {
  McpPrimitives,
  type McpPrimitivesValue,
  uniqueSymbol,
} from "./utils.js";

function describeRoute<T extends DescribeOptions = DescribeOptions>(
  type: McpPrimitivesValue,
) {
  return (docs?: T): MiddlewareHandler => {
    const middleware: MiddlewareHandler = async (_c, next) => {
      await next();
    };

    return Object.assign(middleware, {
      [uniqueSymbol]: {
        toJson: docs ?? {},
        type,
      },
    });
  };
}

/**
 * Describe prompt's name and description
 */
export const describePrompt = describeRoute<
  DescribeOptions & {
    completion?: CompletionFn;
  }
>(McpPrimitives.PROMPTS);

/**
 * Describe tool's name and description
 */
export const describeTool = describeRoute<
  DescribeOptions & {
    resourceType?: "raw" | "json" | "text";
  }
>(McpPrimitives.TOOLS);
