import { StdioServerTransport } from "./transport";
import { Hono } from "hono";
import { muppet, describeTool, validator } from "muppet";
import z from "zod";
import pino from "pino";

const app = new Hono();

app.post(
  "/",
  describeTool({
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
    return c.json({
      content: [
        {
          type: "text",
          text: `Hello ${payload.name}!`,
        },
      ],
    });
  },
);

// "E:/dev/muppet/muppet/examples/mcp-sdk/dist/main.log"

muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
  transport: new StdioServerTransport(),
  logger: {
    stream: pino.destination(
      "~/dev/muppet-dev/muppet/examples/mcp-sdk/dist/main.log",
    ),
  },
});
