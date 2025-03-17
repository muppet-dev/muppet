import type { HandlerFn } from "@/types";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { toJsonSchema } from "@standard-community/standard-json";

const EMPTY_OBJECT_JSON_SCHEMA = {
  type: "object" as const,
};

export const listToolsHandler: HandlerFn = async (ctx, request, config) => {
  ctx.logger.info({
    msg: "Listing tools",
    request,
  });

  if (!config.tools) {
    return;
  }

  const validatedData = ListToolsRequestSchema.parse(request);

  return {
    result: {
      tools: await Promise.all(
        Object.entries(config.tools).map(async ([name, tool]) => ({
          name,
          description: tool.description,
          inputSchema: tool.schema
            ? await toJsonSchema(tool.schema)
            : EMPTY_OBJECT_JSON_SCHEMA,
        })),
      ),
    },
  };
};
