import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  JSONRPCMessageSchema,
  type JSONRPCMessage,
} from "@modelcontextprotocol/sdk/types.js";
import type { SSEStreamingApi } from "hono/streaming";
import { randomUUID } from "node:crypto";
import type { Context } from "hono";

const MAXIMUM_MESSAGE_SIZE = "4mb";

/**
 * Server transport for SSE: this will send messages over an SSE connection and receive messages from HTTP POST requests.
 *
 * This transport is only available in Node.js environments.
 */
export class SSEServerTransport implements Transport {
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
    private stream: SSEStreamingApi,
  ) {
    this._sessionId = randomUUID();
    this._stream = stream;
  }

  /**
   * Handles the initial SSE connection request.
   *
   * This should be called when a GET request is made to establish the SSE stream.
   */
  async start(): Promise<void> {
    // Send the endpoint event
    await this._stream?.writeSSE({
      data: `${encodeURI(this._endpoint)}?sessionId=${this._sessionId}`,
      event: "endpoint",
    });

    // this._sseResponse = this.res;
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
  async handlePostMessage(
    c: Context,
    stream: SSEStreamingApi,
    parsedBody?: unknown,
  ): Promise<void> {
    if (!this._stream) {
      throw new Error("SSE connection not established");
    }

    // let body: string | unknown;
    // try {

    //   const ct = c.req.header("content-type");
    //   if (ct.type !== "application/json") {
    //     throw new Error(`Unsupported content-type: ${ct}`);
    //   }

    //   body = parsedBody ?? await getRawBody(req, {
    //     limit: MAXIMUM_MESSAGE_SIZE,
    //     encoding: ct.parameters.charset ?? "utf-8",
    //   });
    // } catch (error) {
    //   res.writeHead(400).end(String(error));
    //   this.onerror?.(error as Error);
    //   return;
    // }

    const body = await c.req.json();
    try {
      await this.handleMessage(body);
    } catch {
      console.log(`Invalid message: ${body}`);
      await stream.close();
      return;
    }

    await stream.close();
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
