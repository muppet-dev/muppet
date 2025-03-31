import type { Emitter } from "@hono/event-emitter";
import type { JSONSchema7 } from "json-schema";
import type { Logger } from "pino";
import type { McpPrimitivesValue } from "./utils";
import type z from "zod";
import type {
  EmbeddedResourceSchema,
  ImageContentSchema,
  TextContentSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Env, Hono, Schema, ValidationTargets } from "hono";
import type { BlankEnv, BlankSchema } from "hono/types";

export type HasUndefined<T> = undefined extends T ? true : false;

export type DescribeOptions = {
  name?: string;
  description?: string;
};

export type PromptDescribeOptions = DescribeOptions & {
  completion?: CompletionFn;
};

export type ToolDescribeOptions = DescribeOptions & {
  resourceType?: "raw" | "text";
};

export type CompletionFn = (args: {
  name: string;
  value: string;
}) => Promisify<
  | {
      /**
       * An array of completion values. Must not exceed 100 items.
       */
      values: string[];
      /**
       * The total number of completion options available. This can exceed the number of values actually sent in the response.
       */
      total?: number;
      /**
       * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
       */
      hasMore?: boolean;
    }
  | string[]
>;

export type ToolHandlerResponse = {
  toJson?:
    | DescribeOptions
    | ((config?: Record<string, unknown>) => Promise<JSONSchema7>);
  /**
   * Target for validation
   */
  validationTarget?: keyof ValidationTargets;
  type?: McpPrimitivesValue;
};

export type BaseEnv<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
> = {
  Variables: {
    muppet: MuppetConfiguration;
    specs: ServerConfiguration;
    app: Hono<E, S, P>;
  };
};

export type CreateMuppetOptions<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
> = {
  specs: ServerConfiguration;
  config: MuppetConfiguration;
  app: Hono<E, S, P>;
};

export type ServerConfiguration = {
  tools?: ToolsConfiguration;
  prompts?: PromptConfiguration;
  resources?: ResourceConfiguration;
};

export type ToolsConfiguration = Record<
  string,
  ToolDescribeOptions & {
    inputSchema: JSONSchema7;
    schema?: { [K in keyof ValidationTargets]?: JSONSchema7 };
    path: string;
    method: string;
  }
>;

export type PromptConfiguration = Record<
  string,
  PromptDescribeOptions & {
    arguments: { name: string; description?: string; required?: boolean }[];
    schema?: { [K in keyof ValidationTargets]?: JSONSchema7 };
    path: string;
    method: string;
  }
>;

export type ResourceConfiguration = Record<
  string,
  {
    path: string;
    method: string;
  }
>;

export type Resource =
  | {
      type?: "direct";
      uri: string;
      name: string;
      description?: string;
      mimeType?: string;
    }
  | {
      type: "template";
      uri: string;
      name: string;
      description?: string;
      mimeType?: string;
      completion?: CompletionFn;
    };

export type ResourceResponse = {
  uri: string;
  mimeType?: string;
  /**
   * For text resources
   */
  text?: string;
  /**
   * For binary resources (base64 encoded)
   */
  blob?: string;
};

// Path -> Method -> Configuration
export type ConceptConfiguration = Record<
  string,
  | Record<
      string,
      | (DescribeOptions & {
          schema?: { [K in keyof ValidationTargets]?: JSONSchema7 };
          type?: McpPrimitivesValue;
          completion?: CompletionFn;
        })
      | undefined
    >
  | undefined
>;

export type ClientToServerNotifications = {
  "notifications/initialized": undefined;
  "notifications/cancelled": undefined;
  "notifications/roots/list_changed": undefined;
};

export type ServerToClientNotifications = {
  "notifications/cancelled": undefined;
  "notifications/message": undefined;
  "notifications/tools/list_changed": undefined;
  "notifications/prompts/list_changed": undefined;
  "notifications/resources/updated": undefined;
  "notifications/resources/list_changed": undefined;
  "notifications/progress": undefined;
};

export type SubscriptionEvents = {
  "resources/unsubscribe": undefined;
  "resources/subscribe": undefined;
};

export type Promisify<T> = T | Promise<T>;

export type ResourceFetcherFn = (
  uri: string,
) => Promisify<ResourceResponse[] | { contents: ResourceResponse[] }>;

export type MuppetConfiguration = {
  name: string;
  version: string;
  logger?: Logger;
  events?: Emitter<ClientToServerNotifications>;
  resources?: Record<string, ResourceFetcherFn>;
  symbols?: unknown[];
};

export type ToolContentResponseType =
  | z.infer<typeof TextContentSchema>
  | z.infer<typeof ImageContentSchema>
  | z.infer<typeof EmbeddedResourceSchema>;

export type ToolResponseType =
  | { content: ToolContentResponseType[] }
  | ToolContentResponseType[];

export type PromptContentResponseType = {
  role: "user" | "assistant";
  content: ToolContentResponseType;
};

export type PromptResponseType =
  | {
      description: string;
      messages: PromptContentResponseType[];
    }
  | PromptContentResponseType[];
