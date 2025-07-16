import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Muppet } from "muppet";
import z from "zod";

const mcp = new Muppet({
  name: "My Muppet",
  version: "1.0.0",
});

mcp.tool(
  {
    name: "greet-user-with-hello",
    description:
      "This will take in the name of the user and greet them. eg. Hello John",
    inputSchema: z.object({
      name: z.string(),
    }),
  },
  (c) => {
    return {
      content: [{
        type: "text",
        text: `Hello ${c.message.params.arguments.name}!`,
      }],
    };
  },
);

mcp.connect(new StdioServerTransport());
