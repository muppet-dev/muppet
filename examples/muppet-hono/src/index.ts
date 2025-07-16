import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import { Muppet } from "muppet";
import { z } from "zod";

const mcp = new Muppet<{ Variables: { surname: string } }>({
  name: "muppet-hono",
  version: "0.0.1",
});

mcp.tool({
  name: "hello",
  description: "Say hello",
  inputSchema: z.object({
    name: z.string(),
  }),
}, (c) => {
  const name = c.message.params.arguments.name;
  return {
    content: [
      {
        type: "text",
        text: `Hello ${name}!`,
      },
    ],
  };
});

const app = new Hono();

app.all("/mcp", async (c) => {
  const transport = new StreamableHTTPTransport();
  await mcp.connect(transport);
  return transport.handleRequest(c);
});

app.get("/", (c) => c.text("Hello World"));

export default {
  fetch: app.fetch,
  port: 3005,
};
