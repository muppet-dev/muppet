import type {
  BlobResourceContents,
  CallToolRequest,
  CallToolResult,
  ClientRequest,
  Env,
  GetPromptRequest,
  GetPromptResult,
  MCPError,
  ServerResult,
  TextResourceContents,
} from "./types";
import { audioContent, type ContentOptions, imageContent } from "./utils";

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

export class BaseContext<
  E extends Env,
  M extends ClientRequest = ClientRequest,
  R extends ServerResult = ServerResult,
> {
  #var: Map<unknown, unknown> | undefined;
  finalized = false;
  error: MCPError | undefined;
  #result: R | undefined;

  constructor(public message: M, options?: { env?: E }) {
    if (options?.env) {
      this.#var = new Map(Object.entries(options.env.Variables ?? {}));
    }
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
    return (this.#var ? this.#var.get(key) : undefined) as E["Variables"][
      typeof key
    ];
  };

  get var(): Readonly<any> {
    if (!this.#var) {
      return {} as any;
    }
    return Object.fromEntries(this.#var);
  }
}

export class ToolContext<
  E extends Env,
> extends BaseContext<E, CallToolRequest, CallToolResult> {
  text(
    content: string,
    options?: { _meta?: Record<string, unknown> },
  ) {
    this.result = {
      content: [{
        type: "text",
        text: content,
        _meta: options?._meta,
      }],
    };
  }

  async image(
    content: ContentOptions,
    options?: { _meta?: Record<string, unknown> },
  ) {
    this.result = {
      content: [await imageContent(content, options)],
    };
  }

  async audio(
    content: ContentOptions,
    options?: { _meta?: Record<string, unknown> },
  ) {
    this.result = {
      content: [await audioContent(content, options)],
    };
  }

  resource(
    embed: TextResourceContents | BlobResourceContents,
    options?: { _meta?: Record<string, unknown> },
  ) {
    this.result = {
      content: [{
        type: "resource",
        resource: embed,
        _meta: options?._meta,
      }],
    };
  }

  link(
    uri: string,
    options?: {
      mimeType?: string;
      _meta?: Record<string, unknown>;
    },
  ) {
    this.result = {
      content: [{
        type: "resource_link",
        uri,
        mimeType: options?.mimeType,
        _meta: options?._meta,
      }],
    };
  }
}

export class PromptContext<E extends Env> extends BaseContext<
  E,
  GetPromptRequest,
  GetPromptResult
> {
}
