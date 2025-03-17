import {
  InitializeRequestSchema,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  type ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js";
import type { HandlerFn } from "../types";

export const initializeHandler: HandlerFn = (ctx, request, config) => {
  ctx.logger.info({
    msg: "Initializing mcp server",
    request,
  });

  const validatedData = InitializeRequestSchema.parse(request);
  const requestedVersion = validatedData.params.protocolVersion;

  const capabilities: ServerCapabilities = {};

  if (config.tools) {
    capabilities.tools = {};
  }

  return {
    result: {
      protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
        ? requestedVersion
        : LATEST_PROTOCOL_VERSION,
      serverInfo: {
        name: config.name,
        version: config.version,
      },
      capabilities,
    },
  };
};
