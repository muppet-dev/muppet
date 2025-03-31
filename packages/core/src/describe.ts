import type { MiddlewareHandler } from "hono/types";
import type {
  DescribeOptions,
  PromptDescribeOptions,
  ToolDescribeOptions,
} from "./types.js";
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
export const describePrompt = describeRoute<PromptDescribeOptions>(
  McpPrimitives.PROMPTS,
);

/**
 * Describe tool's name and description
 */
export const describeTool = describeRoute<ToolDescribeOptions>(
  McpPrimitives.TOOLS,
);
