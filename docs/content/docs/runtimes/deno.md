---
title: Deno
---

Here is an example of how to set up Muppet with Deno. You can use any transport layer you want, but here we will use the SSE transport layer.

```ts
let transport: SSEHonoTransport | null = null;

const server = new Hono();

server.get("/sse", (c) => {
  return streamSSE(c, async (stream) => {
    transport = new SSEHonoTransport("/messages");
    transport.connectWithStream(stream);

    await bridge({
      mcp,
      transport,
    });
  });
});

server.post("/messages", async (c) => {
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

Deno.serve(server.fetch);
```
