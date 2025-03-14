import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMuppet } from "muppet";

const transport = new StdioServerTransport();

createMuppet({
  name: "mcp-sdk",
  version: "0.0.1",
  transport,
  logger: {
    path: "/Users/adityamathur/dev/muppet-dev/muppet/examples/mcp-sdk/dist/main.log",
  },
}).then((muppet) => muppet.start());
