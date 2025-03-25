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
// import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEHonoTransport, streamSSE } from "muppet/transports";
import { serve, type HttpBindings } from "@hono/node-server";

const app = new Hono();
const logger = undefined;
// pino(
//   pino.destination(
//     "/Users/adityamathur/dev/muppet-dev/muppet/examples/mcp-sdk/dist/main.log",
//   ),
//);

// Define a simple hello world tool
app.post(
  "/hello",
  describeTool({
    name: "Hello World",
    description: "A simple hello world route",
  }),
  mValidator(
    z.object({
      name: z.string().describe("Name of the user"),
      age: z.coerce.number().optional(),
      isEnabled: z.boolean().optional(),
      apps: z.string().array().optional(),
      sample: z
        .object({
          name: z.string(),
          age: z.number(),
        })
        .optional(),
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
let transport: SSEHonoTransport | null = null;

const server = new Hono<{ Bindings: HttpBindings }>().use(async (c, next) => {
  console.log("Request received", c.req.method, c.req.url);

  await next();
});

server.get("/", (c) => c.text("ok!"));

server.get("/sse", async (c) => {
  return streamSSE(c, async (stream) => {
    transport = new SSEHonoTransport("/messages", stream);

    const mcp = await mcpServer;
    if (!mcp) {
      throw new Error("MCP not initialized");
    }

    await bridge({
      mcp,
      transport,
      logger,
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
    port: 3005,
  },
  (info) => {
    console.log("Server started on", info.port);
  },
);
