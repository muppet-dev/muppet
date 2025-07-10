import { Hono } from "hono";
import { StreamableHTTPTransport } from "@hono/mcp";
import { Muppet } from "muppet";
import { z } from "zod";

const app = new Hono();

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
}, async (c, next) => {
  console.log("Context -", c);
  c.set("surname", "Mathur");
  await next();
}, (c) => {
  const name = c.message.params.arguments.name;
  return {
    content: [
      {
        type: "text",
        text: `Hello ${name} ${c.get("surname")}!`,
      },
    ],
  };
});

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
