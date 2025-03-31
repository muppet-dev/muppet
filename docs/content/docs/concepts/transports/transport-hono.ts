import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bridge, muppet } from "muppet";
import { SSEHonoTransport, streamSSE } from "muppet/streaming";

const app = new Hono();

// Define your tools, prompts, and resources here
// ...

const mcp = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
});

let transport: SSEHonoTransport | null = null;

const server = new Hono();

server.get("/sse", async (c) => {
  c.header("Content-Encoding", "Identity");
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

serve(
  {
    fetch: server.fetch,
    port: 3001,
  },
  (info) => {
    console.log(`Server started at http://localhost:${info.port}`);
  },
);
