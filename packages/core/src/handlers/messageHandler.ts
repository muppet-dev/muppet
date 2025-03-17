import {
  RequestSchema,
  type JSONRPCMessage,
} from "@modelcontextprotocol/sdk/types.js";
import type { HandlerFn } from "../types";
import { initializeHandler } from "./initializeHandler";
import { methodNotFoundHandler } from "./notFound";
import { callToolsHandler, listToolsHandler } from "./tools";

const handlersMap: Record<string, HandlerFn | undefined> = {
  initialize: initializeHandler,
  "tools/call": callToolsHandler,
  "tools/list": listToolsHandler,
};

export const messageHandler: HandlerFn = async (ctx, request, config) => {
  const _request = RequestSchema.parse(request);

  const method = _request.method;

  if ((method === "tools/list" || method === "tools/call") && !config.tools) {
    return;
  }

  const handler = handlersMap[method] ?? methodNotFoundHandler;

  const response = await handler(ctx, request, config);

  ctx.logger.info({
    msg: `Response for ${method}`,
    response,
  });

  return response;
};
