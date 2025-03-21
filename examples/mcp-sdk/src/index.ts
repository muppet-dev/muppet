import { StdioServerTransport } from "./transport";
import { Hono } from "hono";
import {
  muppet,
  describeTool,
  describePrompt,
  mValidator,
  registerResources,
} from "muppet";
import z from "zod";
import pino from "pino";

const app = new Hono();

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
    return c.json({
      content: [
        {
          type: "text",
          text: `Hello ${payload.name}!`,
        },
      ],
    });
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
  mValidator(
    z.object({
      name: z.string(),
    }),
  ),
  describePrompt({ name: "Simple Prompt" }),
  (c) => {
    const { name } = c.req.valid("json");
    return c.json([
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

muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
  transport: new StdioServerTransport(),
  logger: {
    stream: pino.destination(
      "/Users/adityamathur/dev/muppet-dev/muppet/examples/mcp-sdk/dist/main.log",
    ),
  },
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
