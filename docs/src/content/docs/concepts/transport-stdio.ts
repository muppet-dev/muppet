import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";
import { bridge, muppet } from "muppet";

const app = new Hono();

// Define your tools, prompts, and resources here
// ...

muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
}).then((mcp) => {
  if (!mcp) {
    throw new Error("MCP not initialized");
  }

  bridge({
    mcp,
    transport: new StdioServerTransport(),
  });
});
