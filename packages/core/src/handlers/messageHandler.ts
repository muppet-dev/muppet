import {
  RequestSchema,
  type JSONRPCMessage,
} from "@modelcontextprotocol/sdk/types.js";
import type { HandlerFn } from "../types";
import { initializeHandler } from "./initializeHandler";
import { methodNotFoundHandler } from "./notFound";

const handlersMap: Record<string, HandlerFn | undefined> = {
  initialize: initializeHandler,
};

export const messageHandler: HandlerFn = async (ctx, request, config) => {
  const _request = RequestSchema.parse(request);

  const handler = handlersMap[_request.method] ?? methodNotFoundHandler;

  const response = await handler(ctx, request, config);

  ctx.logger.info({
    msg: `Response for ${_request.method}`,
    response,
  });

  return response;
};
