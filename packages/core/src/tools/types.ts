import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { PromptContext, ToolContext } from "./context";

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type Variables = {};

export type BlankEnv = {
  Variables: {
    transport: Transport;
  };
};
export type Env = {
  Variables: Variables;
};

// Handlers
export type Next = () => Promise<void>;

export type ToolOptions = Omit<Tool, "inputSchema" | "outputSchema"> & {
  inputSchema?: StandardSchemaV1;
  outputSchema?: StandardSchemaV1;
};

export type SanitizedToolOptions = ToolOptions & {
  type: "tool";
};

export type ToolHandler<
  E extends Env,
> = (
  c: ToolContext<E>,
  next: Next,
) => CallToolResult | void | Promise<CallToolResult | void>;

export type ToolMiddlewareHandler<
  E extends Env,
> = (
  c: ToolContext<E>,
  next: Next,
) => CallToolResult | void | Promise<CallToolResult | void>;

export type PromptOptions = Omit<Prompt, "arguments"> & {
  arguments: Record<string, StandardSchemaV1>;
};

export type SanitizedPromptOptions = PromptOptions & {
  type: "prompt";
};

export type PromptHandler<
  E extends Env,
> = (
  c: PromptContext<E>,
  next: Next,
) => GetPromptResult | void | Promise<GetPromptResult | void>;

export type PromptMiddlewareHandler<
  E extends Env,
> = (
  c: PromptContext<E>,
  next: Next,
) => GetPromptResult | void | Promise<GetPromptResult | void>;

export type MiddlewareOptions<E extends Env = any> = {
  type: "middleware";
  name: string;
  handler: ToolHandler<E> | ToolMiddlewareHandler<E>;
};

export type RouterRoute = (SanitizedToolOptions | MiddlewareOptions)[];

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
  };
  outputSchema?: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
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

export type CallToolResult = BaseResult & {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
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

export type GetPromptRequest = {
  method: "prompts/get";
  params: BaseRequestParams & {
    name: string;
    arguments?: Record<string, string>;
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

export type ReadResourceRequest = {
  method: "resources/read";
  params: BaseRequestParams & {
    uri: string;
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
  // TODO: add type
  content: unknown;
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

export type ElicitResult = BaseResult & {
  action: "accept" | "decline" | "cancel";
  content?: Record<string, unknown>;
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
  params: BaseRequestParams;
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
  params: BaseRequestParams;
};

// Notifications

type InitializedNotification = {
  method: "notifications/initialized";
  params: BaseRequestParams;
};

type CancelledNotification = {
  type: "notifications/cancelled";
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
  params: BaseRequestParams;
};

type ResourceUpdatedNotification = {
  method: "notifications/resources/updated";
  params: BaseRequestParams & {
    uri: string;
  };
};

type PromptListChangedNotification = {
  method: "notifications/prompts/list_changed";
  params: BaseRequestParams;
};

type ToolListChangedNotification = {
  method: "notifications/tools/list_changed";
  params: BaseRequestParams;
};

type LoggingMessageNotification = {
  method: "notifications/message";
  params: BaseRequestParams & {
    level: LoggingLevel;
    logger?: string;
    data: unknown;
  };
};

type RootsListChangedNotification = {
  method: "notifications/roots/list_changed";
  params: BaseRequestParams;
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

export type ClientResult = CreateMessageResult | ElicitResult | ListRootsResult;

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
