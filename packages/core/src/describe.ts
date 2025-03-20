import type { MiddlewareHandler } from "hono/types";
import {
  McpPrimitives,
  uniqueSymbol,
  type McpPrimitivesValue,
} from "./utils.js";

export type DescribeOptions = {
  name?: string;
  description?: string;
};

function describeRoute(type: McpPrimitivesValue) {
  return (docs: DescribeOptions = {}): MiddlewareHandler => {
    const middleware: MiddlewareHandler = async (_c, next) => {
      await next();
    };

    return Object.assign(middleware, {
      [uniqueSymbol]: {
        resolver: () => docs,
        type,
      },
    });
  };
}

export const describePrompt = describeRoute(McpPrimitives.PROMPTS);
export const describeResource = describeRoute(McpPrimitives.RESOURCES);
export const describeTool = describeRoute(McpPrimitives.TOOLS);
