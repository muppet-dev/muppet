import { Hono } from "hono";
import {
  muppet,
  describeTool,
  describePrompt,
  mValidator,
  registerResources,
  bridge,
  type ToolResponseType,
  type PromptResponseType,
} from "muppet";
import z from "zod";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

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
      name: z.string().optional(),
    }),
  ),
  (c) => {
    const payload = c.req.valid("json");
    return c.json<ToolResponseType>([
      {
        type: "text",
        text: `Hello ${payload.name ?? "World"}!`,
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
const mcpServer = muppet(app, {
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

let transport: SSEServerTransport | null = null;

const server = express().use((req, _, next) => {
  console.log(req.method, req.url);

  next();
});

server.get("/sse", async (_, res) => {
  // Initialize the transport
  transport = new SSEServerTransport("/messages", res);

  // Getting the mcp instance
  const mcp = await mcpServer;

  if (!mcp) {
    throw new Error("MCP not initialized");
  }

  // Bridge the mcp with the transport
  bridge({
    mcp,
    transport,
  });
});

/**
 * This is the endpoint where the client will send the messages
 */
server.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
