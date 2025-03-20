import { StdioServerTransport } from "./transport";
import { Hono } from "hono";
import {
  muppet,
  describeTool,
  staticResource,
  dynamicResource,
  describePrompt,
  validator,
} from "muppet";
import z from "zod";
import pino from "pino";

const app = new Hono();

// Define a simple hello world tool
app.post(
  "/",
  describeTool({
    name: "Hello World",
    description: "A simple hello world route",
  }),
  validator(
    "json",
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

// Define static resources
app.post(
  "/static/*",
  staticResource({
    name: "Static Resource",
    description: "A static resource",
    resource: {
      path: "E:/dev/muppet/muppet/examples/mcp-sdk/dist/static",
    },
  }),
);

// Define Dynamic resources
app.post(
  "/dynamic/*",
  dynamicResource({
    name: "Dynamic Resource",
    description: "A dynamic resource",
  }),
  (c) => {
    return c.json([
      {
        uri: "file:///logs/app.log",
        name: "Application Logs",
        mimeType: "text/plain",
      },
    ]);
  },
);

// Define a simple prompt
app.post(
  "/propmt",
  validator(
    "json",
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
      "~/dev/muppet-dev/muppet/examples/mcp-sdk/dist/main.log",
    ),
  },
});
