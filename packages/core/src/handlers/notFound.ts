import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { HandlerFn } from "../types";

export const methodNotFoundHandler: HandlerFn = (ctx, request) => {
  ctx.logger.error({
    msg: "Method not found",
    request,
  });

  return {
    error: {
      code: ErrorCode.MethodNotFound,
      message: "Method not found",
    },
  };
};
