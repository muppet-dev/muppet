---
title: Bun
---

With [Bun](https://bun.sh) you can run Muppet on both the transport layers.

For the SSE transport layer, you will have to create a proxy server to handle the SSE connection. Here is an example of how to do that:

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

export default server;
```
