import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  RequestSchema,
  type JSONRPCMessage,
} from "@modelcontextprotocol/sdk/types.js";
import type { Env, Hono, Schema } from "hono";
import type { BlankSchema } from "hono/types";
import type { Logger } from "pino";

export type BridgeOptions<
  E extends Env = any,
  S extends Schema = BlankSchema,
  P extends string = string,
> = {
  /**
   * The Muppet app instance
   */
  mcp: Hono<E, S, P>;
  /**
   * The transport that will be used to send and receive messages
   */
  transport: Transport;
  /**
   * The logger that will be used to log messages
   */
  logger?: Logger;
};

/**
 * Bridge aka Bifrost, the connection between the app and the transport
 * @param options
 */
export function bridge(options: BridgeOptions) {
  const { mcp: app, transport, logger } = options;

  let messageId = 0;

  transport.onmessage = async (message) => {
    const payload = await handleMessage({
      mcp: app,
      message,
      logger,
    });

    if ("method" in message && message.method === "initialize") messageId = -1;

    if (payload) {
      messageId++;

      await transport
        .send({
          ...payload,
          id: messageId,
        } as JSONRPCMessage)
        .then(() => logger?.info("Sent response"))
        .catch((error) => logger?.error(error, "Failed to send cancellation"));
    }
  };

  return transport.start();
}

export type HandleMessageOptions<
  E extends Env = any,
  S extends Schema = BlankSchema,
  P extends string = string,
> = {
  /**
   * The Muppet app instance
   */
  mcp: Hono<E, S, P>;
  /**
   * The message received from the MCP Client
   */
  message: unknown;
  /**
   * The logger that will be used to log messages
   */
  logger?: Logger;
};

/**
 * Processes the message and generates the response for the MCPs.
 * @param options
 */
export async function handleMessage(options: HandleMessageOptions) {
  const { mcp: app, message, logger } = options;

  logger?.info(
    { message, string: JSON.stringify(message) },
    "Received message",
  );

  const validatedMessage = RequestSchema.parse(message);

  const response = await app.request(validatedMessage.method, {
    method: "POST",
    body: JSON.stringify(message),
    headers: {
      "content-type": "application/json",
    },
  });

  // If there's no payload, we don't need to send a response. Eg. Notifications
  if (response.status === 204) return null;

  const payload = (await response.json()) as JSONRPCMessage;
  payload.jsonrpc = "2.0";

  logger?.info({ payload }, "Response payload");

  return payload;
}
