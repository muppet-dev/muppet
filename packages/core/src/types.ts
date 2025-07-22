import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { JSONSchema7 } from "json-schema";
import * as v from "valibot";
import type { Context } from "./context";

export type PromiseOr<T> = T | Promise<T>;

export type Variables = object;

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type BlankEnv = {};
export type Env = {
  Variables?: Variables;
};

export type ErrorHandler<E extends Env = any> = (
  err: Error,
  c: Context<E>,
) => void | Promise<void>;

export type NotFoundHandler<E extends Env = any> = (
  c: Context<E>,
) => void | Promise<void>;

// Handlers
export type Next = () => Promise<void>;

type BaseHandler<
  E extends Env,
  M extends ClientRequest,
  R extends ServerResult,
> = (c: Context<E, M, R>, next: Next) => PromiseOr<R>;

type BaseMiddlewareHandler<
  E extends Env,
  M extends ClientRequest,
  R extends ServerResult,
> = (c: Context<E, M, R>, next: Next) => Promise<R | void>;

export type ToolOptions<
  I extends StandardSchemaV1 = StandardSchemaV1,
  O extends StandardSchemaV1 = StandardSchemaV1,
> = Omit<Tool, "inputSchema" | "outputSchema"> & {
  inputSchema?: I;
  outputSchema?: O;
};

export type SanitizedToolOptions = ToolOptions & {
  type: "tool";
  disabled?: boolean;
};

export type ToolHandler<
  E extends Env,
  I extends StandardSchemaV1 = StandardSchemaV1,
  O extends StandardSchemaV1 = StandardSchemaV1,
> = BaseHandler<E, CallToolRequest<I>, CallToolResult<O>>;

export type ToolMiddlewareHandler<
  E extends Env,
  I extends StandardSchemaV1 = StandardSchemaV1,
  O extends StandardSchemaV1 = StandardSchemaV1,
> = BaseMiddlewareHandler<E, CallToolRequest<I>, CallToolResult<O>>;

export type CompletionFn<
  E extends Env,
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
  K extends keyof I = keyof I,
> = (
  value: StandardSchemaV1.InferOutput<I[K]>,
  context: Context<E, GetPromptRequest<I>, GetPromptResult>,
) => PromiseOr<
  | StandardSchemaV1.InferOutput<I[K]>[]
  | (Omit<CompleteResult["completion"], "values"> & {
    values: StandardSchemaV1.InferOutput<I[K]>[];
  })
>;

export type PromptArgumentWithCompletion<
  E extends Env = Env,
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
  K extends keyof I = keyof I,
> = {
  validation: I[K];
  completion?: CompletionFn<E, I, K>;
};

export type PromptOptions<
  E extends Env = Env,
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = Omit<Prompt, "arguments"> & {
  arguments?: {
    [K in keyof I]: PromptArgumentWithCompletion<E, I, K>;
  };
};

export type SanitizedPromptOptions = PromptOptions & {
  type: "prompt";
  disabled?: boolean;
};

export type PromptHandler<
  E extends Env,
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = BaseHandler<E, GetPromptRequest<I>, GetPromptResult>;

export type PromptMiddlewareHandler<
  E extends Env,
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = BaseMiddlewareHandler<E, GetPromptRequest<I>, GetPromptResult>;

export type ResourceTemplateOptions<
  E extends Env = Env,
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = ResourceTemplate & {
  arguments?: {
    [K in keyof I]: PromptArgumentWithCompletion<E, I, K>;
  };
};

export type ResourceOptions<
  E extends Env = Env,
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = Resource | ResourceTemplateOptions<E, I>;

export type SanitizedSimpleResourceOptions = {
  type: "resource";
  disabled?: boolean;
} & Resource;

export type SanitizedResourceTemplateOptions = {
  type: "resource-template";
  disabled?: boolean;
} & ResourceTemplateOptions;

export type SanitizedResourceOptions =
  | SanitizedSimpleResourceOptions
  | SanitizedResourceTemplateOptions;

export type ResourceHandler<
  E extends Env,
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = BaseHandler<E, ReadResourceRequest<I>, ReadResourceResult>;

export type ResourceMiddlewareHandler<
  E extends Env,
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = BaseMiddlewareHandler<E, ReadResourceRequest<I>, ReadResourceResult>;

export type H<E extends Env> =
  | ToolHandler<E>
  | ToolMiddlewareHandler<E>
  | PromptHandler<E>
  | PromptMiddlewareHandler<E>
  | ResourceHandler<E>
  | ResourceMiddlewareHandler<E>;

export type MiddlewareOptions<E extends Env = any> = {
  type: "middleware";
  name: string;
  handler: H<E>;
};

export type RouterRoute = (
  | SanitizedToolOptions
  | SanitizedPromptOptions
  | SanitizedResourceOptions
  | MiddlewareOptions
)[];

// MCP Type Utils

export const BaseRequestParamsSchema = v.object({
  _meta: v.optional(v.record(v.string(), v.unknown())),
});

export type BaseRequestParams = v.InferOutput<typeof BaseRequestParamsSchema>;

export const BaseResultSchema = v.object({
  _meta: v.optional(v.record(v.string(), v.unknown())),
});

export type BaseResult = v.InferOutput<typeof BaseResultSchema>;

export const BasePaginatedResultSchema = v.intersect([
  BaseResultSchema,
  v.object({
    nextCursor: v.optional(v.string()),
  }),
]);

export type BasePaginatedResult = v.InferOutput<
  typeof BasePaginatedResultSchema
>;

const BasePaginatedRequestSchema = v.object({
  cursor: v.optional(v.string()),
});

export const BaseMetadataSchema = v.object({
  name: v.string(),
  title: v.optional(v.string()),
});

export type BaseMetadata = v.InferOutput<typeof BaseMetadataSchema>;

export type Progress = {
  progress: number;
  total?: number;
  message?: string;
};

export type ProgressCallback = (progress: Progress) => void;

export type RequestOptions = {
  onprogress?: ProgressCallback;
  signal?: AbortSignal;
  timeout?: number;
  maxTotalTimeout?: number;
  resetTimeoutOnProgress?: boolean;
};

// Errors

export type MCPError = {
  code: number;
  message: string;
  data?: unknown;
};

// Initialize

export const ClientCapabilitiesSchema = v.object({
  experimental: v.optional(v.record(v.string(), v.unknown())),
  sampling: v.optional(v.record(v.string(), v.unknown())),
  elicitation: v.optional(v.record(v.string(), v.unknown())),
  roots: v.optional(v.object({
    listChanged: v.optional(v.boolean()),
  })),
});

export type ClientCapabilities = v.InferOutput<typeof ClientCapabilitiesSchema>;

export const ImplementationSchema = v.intersect([
  BaseMetadataSchema,
  v.object({
    version: v.string(),
  }),
]);

export type Implementation = v.InferOutput<typeof ImplementationSchema>;

export const InitializeRequestSchema = v.object({
  method: v.literal("initialize"),
  params: v.intersect([
    BaseRequestParamsSchema,
    v.object({
      protocolVersion: v.string(),
      capabilities: ClientCapabilitiesSchema,
      clientInfo: ImplementationSchema,
    }),
  ]),
});

export type InitializeRequest = v.InferOutput<typeof InitializeRequestSchema>;

export type ServerCapabilities = {
  experimental?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  completion?: Record<string, unknown>;
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
};

export type InitializeResult = {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
  instructions?: string;
};

// Content

export type ResourceContents = {
  uri: string;
  mimeType?: string;
  _meta?: Record<string, unknown>;
};

export type TextResourceContents = ResourceContents & {
  text: string;
};

export type BlobResourceContents = ResourceContents & {
  blob: string;
};

export type TextContent = {
  type: "text";
  text: string;
  _meta?: Record<string, unknown>;
};

export type ImageContent = {
  type: "image";
  data: string;
  mimeType: string;
  _meta?: Record<string, unknown>;
};

export type AudioContent = {
  type: "audio";
  data: string;
  mimeType: string;
  _meta?: Record<string, unknown>;
};

export type EmbeddedResource = {
  type: "resource";
  resource: TextResourceContents | BlobResourceContents;
  _meta?: Record<string, unknown>;
};

export type ResourceLink = ResourceContents & {
  type: "resource_link";
};

export type ContentBlock =
  | TextContent
  | ImageContent
  | AudioContent
  | EmbeddedResource
  | ResourceLink;

// Tools

const ListToolsRequestSchema = v.object({
  method: v.literal("tools/list"),
  params: v.intersect([
    BaseRequestParamsSchema,
    BasePaginatedRequestSchema,
  ]),
});

export type ListToolsRequest = v.InferOutput<typeof ListToolsRequestSchema>;

export type ToolAnnotation = {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export type Tool = BaseMetadata & {
  description?: string;
  inputSchema:
    | {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    }
    | JSONSchema7;
  outputSchema?:
    | {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    }
    | JSONSchema7;
  annotations?: ToolAnnotation;
};

export type ListToolsResult = BasePaginatedResult & {
  tools: Tool[];
};

const CallToolRequestSchema = v.object({
  method: v.literal("tools/call"),
  params: v.intersect([
    BaseRequestParamsSchema,
    v.object({
      name: v.string(),
      arguments: v.record(v.string(), v.unknown()),
    }),
  ]),
});

export type CallToolRequest<T extends StandardSchemaV1 = StandardSchemaV1> = {
  method: "tools/call";
  params: BaseRequestParams & {
    name: string;
    arguments: StandardSchemaV1.InferOutput<T>;
  };
};

export type CallToolResult<T extends StandardSchemaV1 = StandardSchemaV1> =
  & BaseResult
  & {
    content: ContentBlock[];
    structuredContent?:
      | StandardSchemaV1.InferOutput<T>
      | Record<string, unknown>;
    isError?: boolean;
  };

// Prompts

const PromptArgumentSchema = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  required: v.optional(v.boolean()),
});

export type PromptArgument = v.InferOutput<typeof PromptArgumentSchema>;

const PromptSchema = v.intersect([
  BaseMetadataSchema,
  v.object({
    description: v.optional(v.string()),
    arguments: v.optional(v.array(PromptArgumentSchema)),
    _meta: v.optional(v.record(v.string(), v.unknown())),
  }),
]);

export type Prompt = v.InferOutput<typeof PromptSchema>;

const ListPromptsRequestSchema = v.object({
  method: v.literal("prompts/list"),
  params: v.intersect([
    BaseRequestParamsSchema,
    BasePaginatedRequestSchema,
  ]),
});

export type ListPromptsRequest = v.InferOutput<typeof ListPromptsRequestSchema>;

export const ListPromptsResultSchema = v.intersect([
  BasePaginatedResultSchema,
  v.object({
    prompts: v.array(PromptSchema),
  }),
]);

export type ListPromptsResult = v.InferOutput<typeof ListPromptsResultSchema>;

const GetPromptRequestSchema = v.object({
  method: v.literal("prompts/get"),
  params: v.intersect([
    BaseRequestParamsSchema,
    v.object({
      name: v.string(),
      arguments: v.record(
        v.string(),
        v.unknown(),
      ),
    }),
  ]),
});

export type GetPromptRequest<
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = {
  method: "prompts/get";
  params: BaseRequestParams & {
    name: string;
    arguments: {
      [K in keyof I]: StandardSchemaV1.InferOutput<I[K]>;
    };
  };
};

export type PromptMessage = {
  role: "user" | "assistant";
  content: ContentBlock;
};

export type GetPromptResult = BaseResult & {
  description?: string;
  messages: PromptMessage[];
};

// Resources

const ListResourcesRequestSchema = v.object({
  method: v.literal("resources/list"),
  params: v.intersect([
    BaseRequestParamsSchema,
    BasePaginatedRequestSchema,
  ]),
});

export type ListResourcesRequest = v.InferOutput<
  typeof ListResourcesRequestSchema
>;

export type Resource = BaseMetadata & {
  uri: string;
  description?: string;
  mimeType?: string;
  _meta?: Record<string, unknown>;
};

export type ListResourcesResult = BasePaginatedResult & {
  resources: Resource[];
};

const ListResourceTemplatesRequestSchema = v.object({
  method: v.literal("resources/templates/list"),
  params: v.intersect([
    BaseRequestParamsSchema,
    BasePaginatedRequestSchema,
  ]),
});

export type ListResourceTemplatesRequest = v.InferOutput<
  typeof ListResourceTemplatesRequestSchema
>;

export type ResourceTemplate = BaseMetadata & {
  uriTemplate: string;
  description?: string;
  mimeType?: string;
  _meta?: Record<string, unknown>;
};

export type ListResourceTemplatesResult = BasePaginatedResult & {
  resourceTemplates: ResourceTemplate[];
};

const ReadResourceRequestSchema = v.object({
  method: v.literal("resources/read"),
  params: v.intersect([
    BaseRequestParamsSchema,
    v.object({
      uri: v.string(),
      arguments: v.optional(
        v.record(
          v.string(),
          v.unknown(),
        ),
      ),
    }),
  ]),
});

export type ReadResourceRequest<
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = {
  method: "resources/read";
  params: BaseRequestParams & {
    uri: string;
    arguments?: {
      [K in keyof I]: StandardSchemaV1.InferOutput<I[K]>;
    };
  };
};

export type ReadResourceResult = BaseResult & {
  contents: (TextResourceContents | BlobResourceContents)[];
};

const SubscribeRequestSchema = v.object({
  method: v.literal("resources/subscribe"),
  params: v.intersect([
    BaseRequestParamsSchema,
    v.object({
      uri: v.string(),
    }),
  ]),
});

export type SubscribeRequest = v.InferOutput<typeof SubscribeRequestSchema>;

const UnsubscribeRequestSchema = v.object({
  method: v.literal("resources/unsubscribe"),
  params: v.intersect([
    BaseRequestParamsSchema,
    v.object({
      uri: v.string(),
    }),
  ]),
});

export type UnsubscribeRequest = v.InferOutput<typeof UnsubscribeRequestSchema>;

// Logging

const LoggingLevelSchema = v.union([
  v.literal("debug"),
  v.literal("info"),
  v.literal("notice"),
  v.literal("warning"),
  v.literal("error"),
  v.literal("critical"),
  v.literal("alert"),
  v.literal("emergency"),
]);

type LoggingLevel = v.InferOutput<typeof LoggingLevelSchema>;

const SetLevelRequestSchema = v.object({
  method: v.literal("logging/setLevel"),
  params: v.intersect([
    BaseRequestParamsSchema,
    v.object({
      level: LoggingLevelSchema,
    }),
  ]),
});

type SetLevelRequest = v.InferOutput<typeof SetLevelRequestSchema>;

// Sampling

export type ModelHint = {
  name?: string;
};

export type ModelPreferences = {
  hints?: ModelHint[];
  costPriority?: number;
  speedPriority?: number;
  intelligencePriority?: number;
};

export type SamplingMessage = {
  role: "user" | "assistant";
  content: TextContent | ImageContent | AudioContent;
};

export type CreateMessageRequest = {
  method: "sampling/createMessage";
  params: BaseRequestParams & {
    messages: SamplingMessage[];
    systemPrompt?: string;
    includeContext?: "none" | "thisServer" | "allServers";
    temperature?: number;
    maxTokens: number;
    stopSequences?: string[];
    metadata?: Record<string, unknown>;
    modelPreferences?: ModelPreferences;
  };
};

export type CreateMessageResult = BaseResult & {
  model: string;
  stopReason: "endTurn" | "stopSequence" | "maxTokens" | string;
  role: "user" | "assistant";
  content:
    | Omit<TextContent, "type">
    | Omit<ImageContent, "type">
    | Omit<AudioContent, "type">;
};

// Elicitation

export type BooleanSchema = {
  type: "boolean";
  title?: string;
  description?: string;
  default?: boolean;
};

export type StringSchema = {
  type: "string";
  title?: string;
  description?: string;
  minLength?: number;
  maxLength?: number;
  format?: "email" | "uri" | "date" | "date-time";
};

export type NumberSchema = {
  type: "number";
  title?: string;
  description?: string;
  minimum?: number;
  maximum?: number;
};

export type EnumSchema = {
  type: "string";
  title?: string;
  description?: string;
  enum: string[];
  enumNames?: string[];
};

export type PrimitiveSchemaDefinition =
  | BooleanSchema
  | StringSchema
  | NumberSchema
  | EnumSchema;

export type ElicitRequest = {
  method: "elicitation/create";
  params: BaseRequestParams & {
    message: string;
    requestedSchema: {
      type: "object";
      properties: Record<string, PrimitiveSchemaDefinition>;
      required?: string[];
    };
  };
};

export type ElicitRequestOptions<
  I extends StandardSchemaV1 = StandardSchemaV1,
> = Omit<ElicitRequest["params"], "requestedSchema"> & {
  requestedSchema: I;
};

export type ElicitResult<I extends StandardSchemaV1 = StandardSchemaV1> =
  & BaseResult
  & {
    action: "accept" | "decline" | "cancel";
    content?: StandardSchemaV1.InferOutput<I>;
  };

// Autocomplete

const ResourceTemplateReferenceSchema = v.object({
  type: v.literal("ref/resource"),
  uri: v.string(),
});

const PromptReferenceSchema = v.object({
  type: v.literal("ref/prompt"),
  name: v.string(),
});

export const CompleteRequestSchema = v.object({
  method: v.literal("completion/complete"),
  params: v.intersect([
    BaseRequestParamsSchema,
    v.object({
      ref: v.union([ResourceTemplateReferenceSchema, PromptReferenceSchema]),
      argument: v.object({
        name: v.string(),
        value: v.string(),
      }),
      context: v.optional(
        v.object({
          arguments: v.optional(v.record(v.string(), v.string())),
        }),
      ),
    }),
  ]),
});

export type CompleteRequest = v.InferOutput<typeof CompleteRequestSchema>;

export type CompleteResult = BaseResult & {
  completion: {
    values: string[];
    total?: number;
    hasMore?: boolean;
  };
};

// Roots

export type ListRootsRequest = {
  method: "roots/list";
  params?: BaseRequestParams;
};

export type Root = {
  uri: string;
  name?: string;
  _meta?: Record<string, unknown>;
};

export type ListRootsResult = BaseResult & {
  roots: Root[];
};

// Ping

export const PingRequestSchema = v.object({
  method: v.literal("ping"),
});

export type PingRequest = v.InferOutput<typeof PingRequestSchema>;

// Notifications

const InitializeNotificationSchema = v.object({
  method: v.literal("notifications/initialized"),
  params: v.optional(BaseRequestParamsSchema),
});

const CancelledNotificationSchema = v.object({
  method: v.literal("notifications/cancelled"),
  params: v.intersect([
    BaseRequestParamsSchema,
    v.object({
      requestId: v.union([v.string(), v.number()]),
      reason: v.optional(v.string()),
    }),
  ]),
});

type CancelledNotification = v.InferOutput<typeof CancelledNotificationSchema>;

const ProgressNotificationSchema = v.object({
  method: v.literal("notifications/progress"),
  params: v.intersect([
    BaseRequestParamsSchema,
    v.object({
      progress: v.number(),
      total: v.optional(v.number()),
      message: v.optional(v.string()),
      progressToken: v.union([v.string(), v.number()]),
    }),
  ]),
});

type ProgressNotification = v.InferOutput<typeof ProgressNotificationSchema>;

type ResourceListChangedNotification = {
  method: "notifications/resources/list_changed";
  params?: BaseRequestParams;
};

export type ResourceUpdatedNotification = {
  method: "notifications/resources/updated";
  params: BaseRequestParams & {
    uri: string;
  };
};

type PromptListChangedNotification = {
  method: "notifications/prompts/list_changed";
  params?: BaseRequestParams;
};

type ToolListChangedNotification = {
  method: "notifications/tools/list_changed";
  params?: BaseRequestParams;
};

export type LoggingMessageNotification = {
  method: "notifications/message";
  params: BaseRequestParams & {
    level: LoggingLevel;
    logger?: string;
    data: unknown;
  };
};

const RootsListChangedNotificationSchema = v.object({
  method: v.literal("notifications/roots/list_changed"),
  params: v.optional(BaseRequestParamsSchema),
});

// Client

export const ClientRequestSchema = v.union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema,
]);

export type ClientRequest =
  | PingRequest
  | InitializeRequest
  | CompleteRequest
  | SetLevelRequest
  | GetPromptRequest
  | ListPromptsRequest
  | ListResourcesRequest
  | ListResourceTemplatesRequest
  | ReadResourceRequest
  | SubscribeRequest
  | UnsubscribeRequest
  | CallToolRequest
  | ListToolsRequest;

export const ClientNotificationSchema = v.union([
  InitializeNotificationSchema,
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  RootsListChangedNotificationSchema,
]);

export type ClientNotification = v.InferOutput<typeof ClientNotificationSchema>;

export type ClientResult =
  | BaseResult
  | CreateMessageResult
  | ElicitResult
  | ListRootsResult;

// Server

export type ServerRequest =
  | PingRequest
  | CreateMessageRequest
  | ElicitRequest
  | ListRootsRequest;

export type ServerNotification =
  | CancelledNotification
  | ProgressNotification
  | LoggingMessageNotification
  | ResourceUpdatedNotification
  | ResourceListChangedNotification
  | ToolListChangedNotification
  | PromptListChangedNotification;

export type ServerResult =
  | BaseResult
  | InitializeResult
  | CompleteResult
  | ListToolsResult
  | CallToolResult
  | ListPromptsResult
  | GetPromptResult
  | ListResourcesResult
  | ListResourceTemplatesResult
  | ReadResourceResult;

// JSON-RPC

export type JSONRPCRequest = {
  jsonrpc: "2.0";
  id: string | number;
};
