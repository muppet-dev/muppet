import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { bridge } from "muppet";
import { fromOpenAPI } from "muppet/openapi";

const mcp = fromOpenAPI({
  // Add your OpenAPI spec here
  info: {
    title: "My Muppet",
    version: "1.0.0",
  },
  openapi: "3.1.0",
  paths: {},
});

bridge({
  mcp,
  transport: new StdioServerTransport(),
});
