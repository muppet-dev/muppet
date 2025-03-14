import type { ToolConfig } from "./tools";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { StaticResource, DynamicResource } from "./resources";
import type { Context } from "hono";

export type MuppetConfig = {
  name: string;
  version: string;
  transport: Transport;
  logger?: {
    path: string;
  };
  tools?: Record<string, ToolConfig>;
  resources?:
    | (StaticResource | DynamicResource)[]
    | Promise<(ctx: Context) => (StaticResource | DynamicResource)[]>;
};
