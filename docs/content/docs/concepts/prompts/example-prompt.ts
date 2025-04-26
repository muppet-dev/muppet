import { Hono } from "hono";
import {
  describePrompt,
  type MuppetEnv,
  mValidator,
  type PromptResponseType,
} from "muppet";
import z from "zod";

const app = new Hono<{ Bindings: { muppet: MuppetEnv } }>();

app.post(
  "/explain-like-im-5",
  describePrompt({
    name: "Explain like I'm 5",
    description: "A prompt to explain an advance topic to a 5 year old",
    completion: ({ name, value }) => [
      "quantum physics",
      "machine learning",
      "natural language processing",
      "artificial intelligence",
    ],
  }),
  mValidator(
    "json",
    z.object({
      topic: z.string(),
    }),
  ),
  (c) => {
    const { topic } = c.req.valid("json");
    return c.json<PromptResponseType>([
      {
        role: "user",
        content: {
          type: "text",
          text: `Explain ${topic} to me like I'm five`,
        },
      },
    ]);
  },
);
