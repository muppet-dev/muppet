import { Hono } from "hono";
import {
  muppet,
  describeTool,
  describePrompt,
  mValidator,
  registerResources,
  bridge,
  type ToolResponseType,
  type Resource,
  type PromptResponseType,
} from "muppet";
import z from "zod";
import pino from "pino";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const app = new Hono();
const logger = pino(
  pino.destination(
    "/Users/adityamathur/dev/muppet-dev/muppet/examples/mcp-sdk/dist/main.log",
  ),
);

// Define a simple hello world tool
app.post(
  "/hello",
  describeTool({
    name: "Hello World",
    description: "A simple hello world route",
  }),
  mValidator(
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

// Define a simple prompt
app.post(
  "/simple",
  describePrompt({ name: "Simple Prompt" }),
  mValidator(
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

// "E:/dev/muppet/muppet/examples/mcp-sdk/dist/main.log"

const mcpServer = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
  logger,
  resources: {
    https: () => {
      return [
        {
          uri: "task1",
          text: "Task 1",
        },
        {
          uri: "task2",
          text: "Task 2",
        },
        {
          uri: "task3",
          text: "Task 3",
        },
        {
          uri: "task4",
          text: "Task 4",
        },
        {
          uri: "task5",
          text: "Task 5",
        },
      ];
    },
  },
});

/**
 * For Stdio transport
 */
// mcpServer.then((mcp) => {
//   if (!mcp) {
//     throw new Error("MCP not initialized");
//   }

//   bridge({
//     mcp,
//     transport: new StdioServerTransport(),
//     logger,
//   });
// });

/**
 * For SSE transport
 */
let transport: SSEServerTransport | null = null;

const server = express().use((req, res, next) => {
  console.log("Request received", req.url);

  next();
});

server.get("/", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);

  const mcp = await mcpServer;

  if (!mcp) {
    throw new Error("MCP not initialized");
  }

  bridge({
    mcp,
    transport,
    logger,
  });
});

server.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

server.listen(3001, () => {
  console.log("Server started on port 3001");
});
