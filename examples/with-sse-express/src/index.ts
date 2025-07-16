import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { Muppet } from "muppet";
import z from "zod";

const mcp = new Muppet({
  name: "My Muppet",
  version: "1.0.0",
});

/**
 * This is a simple 'hello world', which takes a name as input and returns a greeting
 */
mcp.tool({
  name: "greet-user-with-hello",
  description:
    "This will take in the name of the user and greet them. eg. Hello John",
  inputSchema: z.object({
    name: z.string(),
  }),
}, (c) => {
  return {
    content: [{
      type: "text",
      text: `Hello ${c.message.params.arguments.name}!`,
    }],
  };
});

let transport: SSEServerTransport | null = null;

const server = express();

server.get("/sse", async (_, res) => {
  // Initialize the transport
  transport = new SSEServerTransport("/messages", res);

  // Connect the mcp with the transport
  mcp.connect(transport);
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
