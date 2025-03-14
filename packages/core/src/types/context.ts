import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "pino";
import type { MuppetConfig } from "./config";

export type Context = {
  logger: Logger;
};

export type Promisify<T> = T | Promise<T>;

export type HandlerFn = (
  ctx: Context,
  request: JSONRPCMessage,
  config: MuppetConfig,
) => Promisify<Record<string, unknown>>;
