import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";
import { bridge, muppet } from "muppet";

const app = new Hono();

// Define your tools, prompts, and resources here
// ...

bridge({
  mcp: muppet(app, {
    name: "My Muppet",
    version: "1.0.0",
  }),
  transport: new StdioServerTransport(),
});
