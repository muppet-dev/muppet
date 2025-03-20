import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONSchema7 } from "json-schema";
import type { DestinationStream, LoggerOptions } from "pino";
import type { McpPrimitivesValue } from "./utils";
import type { DescribeOptions } from "./describe";
import type { Emitter } from "@hono/event-emitter";

export type HasUndefined<T> = undefined extends T ? true : false;

export type ToolHandlerResponse = {
  resolver: (
    config?: Record<string, unknown>,
  ) => Promise<DescribeOptions | JSONSchema7>;
  type?: McpPrimitivesValue;
};

export type ServerConfiguration = {
  tools?: ToolsConfiguration;
  prompts?: PromptConfiguration;
};

export type ToolsConfiguration = Record<
  string,
  DescribeOptions & { inputSchema: JSONSchema7; path: string }
>;

export type PromptConfiguration = Record<
  string,
  DescribeOptions & {
    arguments: { name: string; description?: string; required?: boolean }[];
    path: string;
  }
>;

export type ConceptConfiguration = Record<
  string,
  | (DescribeOptions & {
      schema?: JSONSchema7;
      type?: McpPrimitivesValue;
      path: string;
    })
  | undefined
>;

export type AvailableEvents = {
  "notifications/initialized": undefined;
  "notifications/cancelled": undefined;
};

export type MuppetConfiguration = {
  name: string;
  version: string;
  transport: Transport;
  logger?: {
    stream?: DestinationStream;
    options?: LoggerOptions;
  };
  events?: Emitter<AvailableEvents>;
};
