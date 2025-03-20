import type { MiddlewareHandler } from "hono/types";
import { McpPrimitives, uniqueSymbol } from "../utils.js";

export type DescribePromptOptions = {
  name?: string;
  description?: string;
};

export function describePrompt(docs: DescribePromptOptions): MiddlewareHandler {
  const middleware: MiddlewareHandler = async (_c, next) => {
    await next();
  };

  return Object.assign(middleware, {
    [uniqueSymbol]: {
      resolver: () => docs,
      type: McpPrimitives.PROMPTS,
    },
  });
}
