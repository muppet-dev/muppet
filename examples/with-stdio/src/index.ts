import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";
import {
  type ToolResponseType,
  bridge,
  describeTool,
  mValidator,
  muppet,
} from "muppet";
import z from "zod";

const app = new Hono();

app.post(
  "/hello",
  describeTool({
    name: "greet-user-with-hello",
    description:
      "This will take in the name of the user and greet them. eg. Hello John",
  }),
  mValidator(
    "json",
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

// Creating a mcp using muppet
const mcp = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
});

bridge({
  mcp,
  transport: new StdioServerTransport(),
});
