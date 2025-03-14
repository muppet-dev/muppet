import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { messageHandler } from "./handlers";
import type { MuppetConfig } from "./types";
import pino from "pino";

export function createMuppet(config: MuppetConfig) {
  const { transport, logger: loggerConfig } = config;

  const logger = pino(
    loggerConfig ? pino.destination(loggerConfig.path) : { enabled: false },
  );

  transport.onclose = () => {
    logger.info("Connection closed");
  };

  transport.onerror = (err) => {
    logger.error({ err }, "Connection error");
  };

  transport.onmessage = async (message) => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let payload: any;

    try {
      const ctx = { logger };
      payload = await messageHandler(ctx, message, config);
    } catch (err) {
      logger.error({ err }, "Error processing message");
      payload = {
        error: {
          // @ts-expect-error
          code: Number.isSafeInteger(err.code)
            ? // @ts-expect-error
              err.code
            : ErrorCode.InternalError,
          // @ts-expect-error
          message: err.message ?? "Internal error",
        },
      };
    }

    transport.send({
      jsonrpc: "2.0",
      // @ts-expect-error
      id: _request.id,
      ...payload,
    });
  };

  return transport;
}
