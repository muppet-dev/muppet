import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  type JSONRPCMessage,
  JSONRPCMessageSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Context } from "hono";
import { SSEStreamingApi } from "hono/streaming";
import { getRuntimeKey } from "hono/adapter";

/**
 * Hono transport for SSE: this will send messages over an SSE connection and receive messages from HTTP POST requests.
 *
 * This can work in all the environments that support SSE with Hono.
 */
export class SSEHonoTransport implements Transport {
  private stream!: SSEStreamingApi;
  private _stream?: SSEStreamingApi;
  private _sessionId: string;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  /**
   * Creates a new SSE server transport, which will direct the client to POST messages to the relative or absolute URL identified by `_endpoint`.
   */
  constructor(
    private _endpoint: string,
    sessionId?: string,
  ) {
    this._sessionId = sessionId ?? crypto.randomUUID();
  }

  connectWithStream(stream: SSEStreamingApi) {
    this.stream = stream;
  }

  get hasStarted() {
    return !!this._stream;
  }

  /**
   * Handles the initial SSE connection request.
   *
   * This should be called when a GET request is made to establish the SSE stream.
   */
  async start(): Promise<void> {
    if (this._stream) {
      throw new Error(
        "SSEServerTransport already started! If using Server class, note that connect() calls start() automatically.",
      );
    }

    // Send the endpoint event
    await this.stream.writeSSE({
      data: `${encodeURI(this._endpoint)}?sessionId=${this._sessionId}`,
      event: "endpoint",
    });

    this._stream = this.stream;

    // TODO: Create an issue for this in hono
    // this._stream.on("close", () => {
    //   this._sseResponse = undefined;
    //   this.onclose?.();
    // });
  }

  /**
   * Handles incoming POST messages.
   *
   * This should be called when a POST request is made to send a message to the server.
   */
  async handlePostMessage(c: Context, parsedBody?: unknown): Promise<void> {
    if (!this._stream) {
      throw new Error("SSE connection not established");
    }

    const body = parsedBody ?? (await c.req.json());
    await this.handleMessage(
      typeof body === "string" ? JSON.parse(body) : body,
    );
  }

  /**
   * Handle a client message, regardless of how it arrived. This can be used to inform the server of messages that arrive via a means different than HTTP POST.
   */
  async handleMessage(message: unknown): Promise<void> {
    let parsedMessage: JSONRPCMessage;
    try {
      parsedMessage = JSONRPCMessageSchema.parse(message);
    } catch (error) {
      this.onerror?.(error as Error);
      throw error;
    }

    this.onmessage?.(parsedMessage);
  }

  async close(): Promise<void> {
    this._stream?.close();
    this._stream = undefined;
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._stream) {
      throw new Error("Not connected");
    }

    this._stream.writeSSE({
      data: JSON.stringify(message),
      event: "message",
    });
  }

  /**
   * Returns the session ID for this transport.
   *
   * This can be used to route incoming POST requests.
   */
  get sessionId(): string {
    return this._sessionId;
  }
}

const run = async (
  stream: SSEStreamingApi,
  cb: (stream: SSEStreamingApi) => Promise<void>,
  onError?: (e: Error, stream: SSEStreamingApi) => Promise<void>,
): Promise<void> => {
  try {
    await cb(stream);
  } catch (e) {
    if (e instanceof Error && onError) {
      await onError(e, stream);

      await stream.writeSSE({
        event: "error",
        data: e.message,
      });
    } else {
      console.error(e);
    }
  }
};

const contextStash: WeakMap<ReadableStream, Context> = new WeakMap<
  ReadableStream,
  Context
>();

export const streamSSE = (
  c: Context,
  cb: (stream: SSEStreamingApi) => Promise<void>,
  onError?: (e: Error, stream: SSEStreamingApi) => Promise<void>,
): Response => {
  const { readable, writable } = new TransformStream();
  const stream = new SSEStreamingApi(writable, readable);

  // Until Bun v1.1.27, Bun didn't call cancel() on the ReadableStream for Response objects from Bun.serve()
  // if (isOldBunVersion()) {
  //   c.req.raw.signal.addEventListener('abort', () => {
  //     if (!stream.closed) {
  //       stream.abort()
  //     }
  //   })
  // }

  // in bun, `c` is destroyed when the request is returned, so hold it until the end of streaming
  contextStash.set(stream.responseReadable, c);

  c.header("Transfer-Encoding", "chunked");
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  const runtime = getRuntimeKey();

  if (runtime === "workerd") {
    c.header("Content-Encoding", "Identity");
  }

  run(stream, cb, onError);

  return c.newResponse(stream.responseReadable);
};
