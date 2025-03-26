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
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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
const mcpServer = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
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

mcpServer.then((mcp) => {
  if (!mcp) {
    throw new Error("MCP not initialized");
  }

  // Bridge the mcp with the transport
  bridge({
    mcp,
    transport: new StdioServerTransport(),
  });
});
