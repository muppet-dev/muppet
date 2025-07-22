import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { toJsonSchema } from "@standard-community/standard-json";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  BaseResult,
  ClientNotification,
  ClientRequest,
  ClientResult,
  CreateMessageRequest,
  CreateMessageResult,
  ElicitRequest,
  ElicitRequestOptions,
  ElicitResult,
  Env,
  JSONRPCRequest,
  ListRootsRequest,
  ListRootsResult,
  LoggingMessageNotification,
  MCPError,
  ProgressCallback,
  RequestOptions,
  ResourceUpdatedNotification,
  ServerNotification,
  ServerRequest,
  ServerResult,
} from "./types";
import { ErrorCode, McpError } from "./utils";

/**
 * Interface for getting context variables.
 *
 * @template E - Environment type.
 */
type Get<E extends Env> = <Key extends keyof E["Variables"]>(
  key: Key,
) => E["Variables"][Key];

/**
 * Interface for setting context variables.
 *
 * @template E - Environment type.
 */
type Set<E extends Env> = <Key extends keyof E["Variables"]>(
  key: Key,
  value: E["Variables"][Key],
) => void;

export class Context<
  E extends Env,
  M extends ClientRequest | ClientNotification =
    | ClientRequest
    | ClientNotification,
  R extends ServerResult = ServerResult,
> {
  #var: Map<unknown, unknown> | undefined;
  finalized = false;
  error: MCPError | undefined;
  #result: R | undefined;
  server: ContextServer;

  constructor(
    public message: M,
    options: { env?: E; transport: Transport },
  ) {
    if (options.env) {
      this.#var = new Map(Object.entries(options.env.Variables ?? {}));
    }

    this.server = new ContextServer(
      // @ts-expect-error
      message.id,
      options.transport,
    );
  }

  get result(): R | undefined {
    return this.#result;
  }

  set result(_result: R | undefined) {
    this.#result = _result;
    this.finalized = true;
  }

  set: Set<E> = (key, value) => {
    this.#var ??= new Map();
    this.#var.set(key, value);
  };

  get: Get<E> = (key) => {
    return (
      this.#var ? this.#var.get(key) : undefined
    ) as E["Variables"][typeof key];
  };

  get var(): Readonly<any> {
    if (!this.#var) {
      return {} as any;
    }
    return Object.fromEntries(this.#var);
  }
}

/**
 * Information about a request's timeout state
 */
type TimeoutInfo = {
  timeoutId: ReturnType<typeof setTimeout>;
  startTime: number;
  timeout: number;
  maxTotalTimeout?: number;
  resetTimeoutOnProgress: boolean;
  onTimeout: () => void;
};

export class ContextServer {
  transport: Transport;

  #messageId: string | number;
  #progressHandlers: Map<string | number, ProgressCallback> = new Map();
  #timeoutInfo: Map<string | number, TimeoutInfo> = new Map();
  #responseHandlers: Map<
    string | number,
    <T extends ClientResult = ClientResult>(
      response: (JSONRPCRequest & { result: T }) | Error,
    ) => void
  > = new Map();

  constructor(messageId: string | number, transport: Transport) {
    this.transport = transport;
    this.#messageId = messageId;
  }

  #setupTimeout(
    messageId: string | number,
    timeout: number,
    maxTotalTimeout: number | undefined,
    onTimeout: () => void,
    resetTimeoutOnProgress = false,
  ) {
    this.#timeoutInfo.set(messageId, {
      timeoutId: setTimeout(onTimeout, timeout),
      startTime: Date.now(),
      timeout,
      maxTotalTimeout,
      resetTimeoutOnProgress,
      onTimeout,
    });
  }

  #cleanupTimeout(messageId: string | number) {
    const info = this.#timeoutInfo.get(messageId);
    if (info) {
      clearTimeout(info.timeoutId);
      this.#timeoutInfo.delete(messageId);
    }
  }

  async ping() {
    return this.request<BaseResult>({ method: "ping" });
  }

  createMessage(
    params: CreateMessageRequest["params"],
    options?: RequestOptions,
  ) {
    return this.request<CreateMessageResult>(
      {
        method: "sampling/createMessage",
        params,
      },
      options,
    );
  }

  async elicitInput<I extends StandardSchemaV1 = StandardSchemaV1>(
    params: ElicitRequestOptions<I>,
    options?: RequestOptions,
  ) {
    const requestedSchema = await toJsonSchema(params.requestedSchema);
    const result = await this.request<ElicitResult<I>>(
      {
        method: "elicitation/create",
        params: {
          ...params,
          requestedSchema:
            requestedSchema as ElicitRequest["params"]["requestedSchema"],
        },
      },
      options,
    );

    // Validate the response content against the requested schema if action is "accept"
    if (result.action === "accept" && result.content) {
      try {
        const validatedResponse = await params.requestedSchema[
          "~standard"
        ].validate(result.content);

        if (validatedResponse.issues) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Elicitation response content does not match requested schema: ${
              validatedResponse.issues
                .map((issue) => issue.message)
                .join(", ")
            }`,
          );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error validating elicitation response: ${error}`,
        );
      }
    }

    return result;
  }

  async listRoots(
    params?: ListRootsRequest["params"],
    options?: RequestOptions,
  ) {
    return this.request<ListRootsResult>(
      { method: "roots/list", params },
      options,
    );
  }

  async sendLoggingMessage(params: LoggingMessageNotification["params"]) {
    return this.notification({ method: "notifications/message", params });
  }

  async sendResourceUpdated(params: ResourceUpdatedNotification["params"]) {
    return this.notification({
      method: "notifications/resources/updated",
      params,
    });
  }

  async sendResourceListChanged() {
    return this.notification({
      method: "notifications/resources/list_changed",
    });
  }

  async sendToolListChanged() {
    return this.notification({ method: "notifications/tools/list_changed" });
  }

  async sendPromptListChanged() {
    return this.notification({ method: "notifications/prompts/list_changed" });
  }

  async request<
    T extends ClientResult = ClientResult,
    U extends ServerRequest = ServerRequest,
  >(request: U, options?: RequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      options?.signal?.throwIfAborted();

      const messageId = this.#messageId;
      const jsonrpcRequest: JSONRPCRequest & U = {
        ...request,
        jsonrpc: "2.0",
        id: messageId,
      };

      if (options?.onprogress) {
        this.#progressHandlers.set(messageId, options.onprogress);

        if ("params" in request && "params" in jsonrpcRequest) {
          jsonrpcRequest.params = {
            ...request.params,
            _meta: {
              ...(request.params?._meta || {}),
              progressToken: messageId,
            },
          };
        }
      }

      const cancel = (reason: unknown) => {
        this.#responseHandlers.delete(messageId);
        this.#progressHandlers.delete(messageId);
        this.#cleanupTimeout(messageId);

        this.transport
          .send({
            jsonrpc: "2.0",
            method: "notifications/cancelled",
            params: {
              requestId: messageId,
              reason: String(reason),
            },
          })
          .catch((error) =>
            this.transport.onerror?.(
              new Error(`Failed to send cancellation: ${error}`),
            )
          );

        reject(reason);
      };

      this.#responseHandlers.set(messageId, (response) => {
        if (options?.signal?.aborted) {
          return;
        }

        if (response instanceof Error) {
          return reject(response);
        }

        try {
          resolve(response.result as unknown as T);
        } catch (error) {
          reject(error);
        }
      });

      options?.signal?.addEventListener("abort", () => {
        cancel(options?.signal?.reason);
      });

      const timeout = options?.timeout ?? 60000;
      const timeoutHandler = () =>
        cancel(
          new McpError(ErrorCode.RequestTimeout, "Request timed out", {
            timeout,
          }),
        );

      this.#setupTimeout(
        messageId,
        timeout,
        options?.maxTotalTimeout,
        timeoutHandler,
        options?.resetTimeoutOnProgress ?? false,
      );

      this.transport.send(jsonrpcRequest).catch((error) => {
        this.#cleanupTimeout(messageId);
        reject(error);
      });
    });
  }

  async notification(
    notification: ServerNotification,
    // TODO: Figure this out
    _options?: NotificationOptions,
  ): Promise<void> {
    await this.transport.send({
      ...notification,
      jsonrpc: "2.0",
    });
  }
}
