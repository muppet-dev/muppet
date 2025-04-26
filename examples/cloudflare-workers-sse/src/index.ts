import { DurableObject } from "cloudflare:workers";
import { type Env, Hono } from "hono";
import { cors } from "hono/cors";
import {
  type MuppetEnv,
  type ToolResponseType,
  bridge,
  describeTool,
  mValidator,
  muppet,
} from "muppet";
import { SSEHonoTransport, streamSSE } from "muppet/streaming";
import z from "zod";

const app = new Hono<{ Bindings: { muppet: MuppetEnv } }>();

app.post(
  "/hello",
  describeTool({
    name: "greet-user-with-hello",
    description:
      "This will take in the name of the user and greet them. eg. Hello John",
  }),
  mValidator(
    "json",
    z.object({
      name: z.string(),
    }),
  ),
  (c) => {
    const { name } = c.req.valid("json");
    return c.json<ToolResponseType>([
      {
        type: "text",
        text: `Hello ${name}!`,
      },
    ]);
  },
);

// Creating a mcp using muppet
const mcp = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
});

/**
 * For SSE transport
 */
const server = new Hono<{ Bindings: { transport: SSEHonoTransport } }>().use(
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
);

server.get("/sse", (c) => {
  return streamSSE(c, async (stream) => {
    c.env.transport.connectWithStream(stream);

    await bridge({
      mcp,
      transport: c.env.transport,
    });
  });
});

server.post("/messages", async (c) => {
  const transport = c.env.transport;

  if (!transport) {
    throw new Error("Transport not initialized");
  }

  await transport.handlePostMessage(c);
  return c.text("ok");
});

server.onError((err, c) => {
  console.error(err);
  return c.body(err.message, 500);
});

export class MyDurableObject extends DurableObject<Env> {
  transport?: SSEHonoTransport;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.transport = new SSEHonoTransport("/messages", ctx.id.toString());
  }

  async fetch(request: Request) {
    return server.fetch(request, {
      ...this.env,
      transport: this.transport,
    });
  }
}

export default {
  async fetch(
    request: Request,
    env: { MY_DO: DurableObjectNamespace<MyDurableObject> },
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    const namespace = env.MY_DO;

    let stub: DurableObjectStub<MyDurableObject>;

    if (sessionId) stub = namespace.get(namespace.idFromString(sessionId));
    else stub = namespace.get(namespace.newUniqueId());

    return stub.fetch(request);
  },
};
