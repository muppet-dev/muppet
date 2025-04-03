---
title: Cloudflare Workers
---

For connecting your MCP with a LLM, you will need to pressists the transport instance. On a server it is quite easy, but on a worker you will need to use Durable Objects to achieve that. Here is an example of how to do that:

```ts
const server = new Hono<{ Bindings: { transport: SSEHonoTransport } }>();

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
```

Over here we are creating a proxy server that will handle the SSE connection. The `MyDurableObject` class is a Durable Object that will handle the transport instance. The `fetch` method will handle the incoming requests and pass them to the Durable Object.

To identify the session, we are using the `sessionId` query parameter. If it is not present, we will create a new Durable Object instance. If it is present, we will use the existing instance.
