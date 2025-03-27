import { type Env, Hono } from "hono";
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
import { DurableObject } from "cloudflare:workers";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

const app = new Hono();

app.get("/", (c) => c.text("Hello World"));

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
const server = new Hono<{ Bindings: { transport: SSEHonoTransport } }>();

server.get("/sse", async (c) => {
  return streamSSE(c, async (stream) => {
    if (!c.env.transport.hasStarted) c.env.transport.connectWithStream(stream);

    const mcp = await mcpServer.catch((err) => {
      console.error(err);
    });
    if (!mcp) {
      throw new Error("MCP not initialized");
    }

    await bridge({
      mcp,
      transport: c.env.transport,
    });
  });
});

server.post("/messages", async (c) => {
  const transport = c.env.transport;

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

export class MyDurableObject extends DurableObject<Env> {
  transport?: SSEHonoTransport;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.transport = new SSEHonoTransport("/messages", ctx.id.name);
  }

  async fetch(request: Request) {
    return server.fetch(request, {
      ...this.env,
      transport: this.transport,
    });
  }
}

export default {
  async fetch(
    request: Request,
    env: { MY_DO: DurableObjectNamespace<MyDurableObject> },
    ctx: ExecutionContext,
  ): Promise<Response> {
    const id: DurableObjectId = env.MY_DO.idFromName("default");

    // A stub is a client used to invoke methods on the Durable Object
    const stub = env.MY_DO.get(id);

    return stub.fetch(request);
  },
};
