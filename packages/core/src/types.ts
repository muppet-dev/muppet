import type { Emitter } from "@hono/event-emitter";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONSchema7 } from "json-schema";
import type { DestinationStream, LoggerOptions } from "pino";
import type { McpPrimitivesValue } from "./utils";

export type HasUndefined<T> = undefined extends T ? true : false;

export type DescribeOptions = {
  name?: string;
  description?: string;
};

export type ToolHandlerResponse = {
  resolver?:
    | DescribeOptions
    | ((config?: Record<string, unknown>) => Promise<JSONSchema7>);
  type?: McpPrimitivesValue;
};

export type ServerConfiguration = {
  tools?: ToolsConfiguration;
  prompts?: PromptConfiguration;
  resources?: ResourceConfiguration;
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

export type ResourceConfiguration = Record<
  string,
  {
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

export type Promisify<T> = T | Promise<T>;

export type MuppetConfiguration = {
  name: string;
  version: string;
  transport: Transport;
  logger?: {
    stream?: DestinationStream;
    options?: LoggerOptions;
  };
  events?: Emitter<AvailableEvents>;
  resources?: Record<
    string,
    (uri: string) => Promisify<
      {
        uri: string;
        mimeType: string;
        /**
         * For text resources
         */
        text?: string;
        /**
         * For binary resources (base64 encoded)
         */
        blob?: string;
      }[]
    >
  >;
};
