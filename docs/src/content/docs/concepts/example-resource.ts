import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";
import { muppet, registerResources } from "muppet";

const app = new Hono();

// Define all the resources that your tool can provide
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
