import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { Hono } from "hono";
import {
  type ToolResponseType,
  bridge,
  describeTool,
  mValidator,
  muppet,
} from "muppet";
import z from "zod";

const app = new Hono();

/**
 * This is a simple 'hello world', which takes a name as input and returns a greeting
 */
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

// Creating a mcp using muppet
const mcp = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
});

let transport: SSEServerTransport | null = null;

const server = express();

server.get("/sse", async (_, res) => {
  // Initialize the transport
  transport = new SSEServerTransport("/messages", res);

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
