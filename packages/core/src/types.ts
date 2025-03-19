import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONSchema7 } from "json-schema";
import type { DestinationStream, LoggerOptions } from "pino";

export type HasUndefined<T> = undefined extends T ? true : false;

export type ToolHandlerResponse = {
  resolver: (
    config?: Record<string, unknown>,
  ) => Promise<DescribeToolRouteOptions | JSONSchema7>;
};

export type DescribeToolRouteOptions = {
  name?: string;
  description?: string;
};

export type ToolConfigurationDocument = Record<
  string,
  DescribeToolRouteOptions & {
    inputSchema?: JSONSchema7;
  }
>;

export type MuppetConfiguration = {
  name: string;
  version: string;
  transport: Transport;
  logger?: DestinationStream | LoggerOptions;
};
