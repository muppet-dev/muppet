import { Hono } from "hono";
import {
  type MuppetEnv,
  type ToolResponseType,
  bridge,
  describeTool,
  mValidator,
  muppet,
} from "muppet";
import { SSEHonoTransport, streamSSE } from "muppet/streaming";
import z from "zod";

const app = new Hono<{ Bindings: { muppet: MuppetEnv } }>();

app.post(
  "/hello",
  describeTool({
    name: "greet-user-with-hello",
    description:
      "This will take in the name of the user and greet them. eg. Hello John",
  }),
  mValidator(
    "json",
    z.object({
      name: z.string(),
    }),
  ),
  (c) => {
    const { name } = c.req.valid("json");
    return c.json<ToolResponseType>([
      {
        type: "text",
        text: `Hello ${name}!`,
      },
    ]);
  },
);

const mcp = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
});

/**
 * For SSE transport
 */
let transport: SSEHonoTransport | null = null;

const server = new Hono().use(
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
);

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

Deno.serve(server.fetch);

function cors(arg0: {
  origin: (origin: any) => any;
  credentials: boolean;
}): any {
  throw new Error("Function not implemented.");
}
