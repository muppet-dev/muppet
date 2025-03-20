import { McpPrimitives, uniqueSymbol } from "@/utils";
import type {
  CompleteResourceTemplateCallback,
  ListResourcesCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MiddlewareHandler } from "hono";

type DynamicResourceOptions = {
  name?: string;
  description?: string;
  mimeType?: string;
  callbacks?: {
    list?: ListResourcesCallback;
    // TODO: Pick keys from context
    complete?: Record<string, CompleteResourceTemplateCallback>;
  };
};

export function dynamicResource(options?: DynamicResourceOptions) {
  const middleware: MiddlewareHandler = async (_c, next) => {
    await next();
  };

  return Object.assign(middleware, {
    [uniqueSymbol]: {
      resolver: () => options,
      type: McpPrimitives.RESOURCES,
    },
  });
}
