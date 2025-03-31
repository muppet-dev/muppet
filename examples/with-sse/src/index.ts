import { Hono } from "hono";
import {
  type PromptResponseType,
  type ToolResponseType,
  describePrompt,
  describeTool,
  mValidator,
  muppet,
  registerResources,
  bridge,
} from "muppet";
import z from "zod";
import { SSEHonoTransport, streamSSE } from "muppet/streaming";
import { serve } from "@hono/node-server";

const app = new Hono();

/**
 * This is a simple 'hello world', which takes a name as input and returns a greeting
 */
app.post(
  "/hello",
  describeTool({
    name: "Hello World",
    description: "A simple hello world route",
  }),
  mValidator(
    "json",
    z.object({
      name: z.string(),
    }),
  ),
  (c) => {
    const payload = c.req.valid("json");
    return c.json<ToolResponseType>([
      {
        type: "text",
        text: `Hello ${payload.name}!`,
      },
    ]);
  },
);

/**
 * Dummy resources, their fetchers are define in the muppet's configuration
 */
app.post(
  "/documents",
  registerResources((c) => {
    return c.json([
      {
        uri: "https://lorem.ipsum",
        name: "Todo list",
        mimeType: "text/plain",
      },
      {
        type: "template",
        uri: "https://lorem.{ending}",
        name: "Todo list",
        mimeType: "text/plain",
      },
    ]);
  }),
);

/**
 * A simple prompt
 */
app.post(
  "/simple",
  describePrompt({ name: "Simple Prompt" }),
  mValidator(
    "json",
    z.object({
      name: z.string(),
    }),
  ),
  (c) => {
    const { name } = c.req.valid("json");
    return c.json<PromptResponseType>([
      {
        role: "user",
        content: {
          type: "text",
          text: `This is a simple prompt for ${name}`,
        },
      },
    ]);
  },
);

// Creating a mcp using muppet
const mcp = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
  resources: {
    https: (uri) => {
      if (uri === "https://lorem.ipsum")
        return [
          {
            uri: "task1",
            text: "This is a fixed task",
          },
        ];

      return [
        {
          uri: "task1",
          text: "This is dynamic task",
        },
        {
          uri: "task2",
          text: "Could be fetched from a DB",
        },
      ];
    },
  },
});

/**
 * For SSE transport
 */
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
