import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";
import {
  describePrompt,
  mValidator,
  muppet,
  type PromptResponseType,
} from "muppet";
import z from "zod";

const app = new Hono();

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
