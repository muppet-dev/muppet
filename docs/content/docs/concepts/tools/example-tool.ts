import { Hono } from "hono";
import {
  type MuppetEnv,
  type ToolResponseType,
  describeTool,
  mValidator,
} from "muppet";
import z from "zod";

const app = new Hono<{ Bindings: { muppet: MuppetEnv } }>();

app.post(
  "/hello",
  describeTool({
    name: "Hello World",
    description: "A simple hello world tool",
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
