import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";
import {
  describeTool,
  mValidator,
  muppet,
  type ToolResponseType,
  bridge,
} from "muppet";
import z from "zod";

const app = new Hono();

// Define a simple hello world tool
app.post(
  "/hello",
  describeTool({
    name: "Hello World",
    description: "A simple hello world route",
  }),
  mValidator(
    // You can use your favorite schema validator,
    // eg - zod, valibot, arktype, typebox, etc
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

// Creating your mcp server
muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
}).then((mcp) => {
  if (!mcp) {
    throw new Error("MCP not initialized");
  }

  // Connecting your mcp to a transport
  bridge({
    mcp,
    transport: new StdioServerTransport(),
  });
});
