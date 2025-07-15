import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { JSONSchema7 } from "json-schema";
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
> = (
  c: Context<E, M, R>,
  next: Next,
) => PromiseOr<R>;

type BaseMiddlewareHandler<
  E extends Env,
  M extends ClientRequest,
  R extends ServerResult,
> = (
  c: Context<E, M, R>,
  next: Next,
) => Promise<R | void>;

export type ToolOptions<
  I extends StandardSchemaV1 = StandardSchemaV1,
  O extends StandardSchemaV1 = StandardSchemaV1,
> = Omit<Tool, "inputSchema" | "outputSchema"> & {
  inputSchema?: I;
  outputSchema?: O;
};

export type SanitizedToolOptions = ToolOptions & {
  type: "tool";
};

export type ToolHandler<
  E extends Env,
  I extends StandardSchemaV1 = StandardSchemaV1,
  O extends StandardSchemaV1 = StandardSchemaV1,
> = BaseHandler<
  E,
  CallToolRequest<I>,
  CallToolResult<O>
>;

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
  | Omit<CompleteResult["completion"], "values"> & {
    values: StandardSchemaV1.InferOutput<I[K]>[];
  }
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
};

export type PromptHandler<
  E extends Env,
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = BaseHandler<
  E,
  GetPromptRequest<I>,
  GetPromptResult
>;

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

export type SanitizedResourceOptions =
  | ({
    type: "resource";
  } & Resource)
  | ({
    type: "resource-template";
  } & ResourceTemplateOptions);

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

export type BaseRequestParams = {
  _meta?: Record<string, unknown>;
};

export type BaseResult = {
  _meta?: Record<string, unknown>;
};

export type BasePaginatedResult = BaseResult & {
  nextCursor?: string;
};

export type BaseMetadata = {
  name: string;
  title?: string;
};

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

export type ClientCapabilitiesSchema = {
  experimental?: Record<string, unknown>;
  sampling?: Record<string, unknown>;
  elicitation?: Record<string, unknown>;
  roots?: { listChanged?: boolean };
};

export type ImplementationSchema = BaseMetadata & {
  version: string;
};

export type InitializeRequestSchema = {
  method: "initialize";
  params: BaseRequestParams & {
    protocolVersion: string;
    capabilities: ClientCapabilitiesSchema;
    clientInfo: ImplementationSchema;
  };
};

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
  serverInfo: ImplementationSchema;
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

export type ListToolsRequest = {
  method: "tools/list";
  params: BaseRequestParams & {
    cursor?: string;
  };
};

export type ToolAnnotation = {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export type Tool = BaseMetadata & {
  description?: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  } | JSONSchema7;
  outputSchema?: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  } | JSONSchema7;
  annotations?: ToolAnnotation;
};

export type ListToolsResult = BasePaginatedResult & {
  tools: Tool[];
};

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

export type PromptArgument = {
  name: string;
  description?: string;
  required?: boolean;
};

export type Prompt = BaseMetadata & {
  description?: string;
  arguments?: PromptArgument[];
  _meta?: Record<string, unknown>;
};

export type ListPromptsRequest = {
  method: "prompts/list";
  params: BaseRequestParams & {
    cursor?: string;
  };
};

export type ListPromptsResult = BasePaginatedResult & {
  prompts: Prompt[];
};

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

export type ListResourcesRequest = {
  method: "resources/list";
  params: BaseRequestParams & {
    cursor?: string;
  };
};

export type Resource = BaseMetadata & {
  uri: string;
  description?: string;
  mimeType?: string;
  _meta?: Record<string, unknown>;
};

export type ListResourcesResult = BasePaginatedResult & {
  resources: Resource[];
};

export type ListResourceTemplatesRequest = {
  method: "resources/templates/list";
  params: BaseRequestParams & {
    cursor?: string;
  };
};

export type ResourceTemplate = BaseMetadata & {
  uriTemplate: string;
  description?: string;
  mimeType?: string;
  _meta?: Record<string, unknown>;
};

export type ListResourceTemplatesResult = BasePaginatedResult & {
  resourceTemplates: ResourceTemplate[];
};

export type ReadResourceRequest<
  I extends Record<string, StandardSchemaV1> = Record<string, StandardSchemaV1>,
> = {
  method: "resources/read";
  params: BaseRequestParams & {
    uri: string;
    arguments: {
      [K in keyof I]: StandardSchemaV1.InferOutput<I[K]>;
    };
  };
};

export type ReadResourceResult = BaseResult & {
  contents: (TextResourceContents | BlobResourceContents)[];
};

export type SubscribeRequest = {
  method: "resources/subscribe";
  params: BaseRequestParams & {
    uri: string;
  };
};

export type UnsubscribeRequest = {
  method: "resources/unsubscribe";
  params: BaseRequestParams & {
    uri: string;
  };
};

// Logging

type LoggingLevel =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical"
  | "alert"
  | "emergency";

type SetLevelRequest = {
  method: "logging/setLevel";
  params: BaseRequestParams & {
    level: LoggingLevel;
  };
};

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

export type ElicitResult<
  I extends StandardSchemaV1 = StandardSchemaV1,
> = BaseResult & {
  action: "accept" | "decline" | "cancel";
  content?: StandardSchemaV1.InferOutput<I>;
};

// Autocomplete

type ResourceTemplateReference = {
  type: "ref/resource";
  uri: string;
};

type PromptReference = {
  type: "ref/prompt";
  name: string;
};

export type CompleteRequest = {
  method: "completion/complete";
  params: BaseRequestParams & {
    ref: ResourceTemplateReference | PromptReference;
    argument: {
      name: string;
      value: string;
    };
    context?: {
      arguments?: Record<string, string>;
    };
  };
};

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

export type PingRequest = {
  method: "ping";
};

// Notifications

type InitializedNotification = {
  method: "notifications/initialized";
  params?: BaseRequestParams;
};

type CancelledNotification = {
  method: "notifications/cancelled";
  params: BaseRequestParams & {
    requestId: string | number;
    reason?: string;
  };
};

type ProgressNotification = {
  method: "notifications/progress";
  params: BaseRequestParams & {
    progress: number;
    total?: number;
    message?: string;
    progressToken: string | number;
  };
};

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

type RootsListChangedNotification = {
  method: "notifications/roots/list_changed";
  params?: BaseRequestParams;
};

// Client

export type ClientRequest =
  | PingRequest
  | InitializeRequestSchema
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

export type ClientNotification =
  | CancelledNotification
  | ProgressNotification
  | InitializedNotification
  | RootsListChangedNotification;

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
