import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";
import { muppet, describeRoute, validator } from "muppet";
import z from "zod";
import pino from "pino";

const app = new Hono();

app.post(
  "/",
  describeRoute({
    name: "Hello World",
    description: "A simple hello world route",
  }),
  validator(
    "json",
    z.object({
      name: z.string(),
    }),
  ),
  (c) => {
    const payload = c.req.valid("json");
    return c.json({ message: `Hello ${payload.name}` });
  },
);

muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
  transport: new StdioServerTransport(),
  logger: {
    stream: pino.destination(
      "E:/dev/muppet/muppet/examples/mcp-sdk/dist/main.log",
    ),
  },
});
