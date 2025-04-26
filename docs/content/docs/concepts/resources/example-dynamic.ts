import { Hono } from "hono";
import { type MuppetEnv, registerResources } from "muppet";

const app = new Hono<{ Bindings: { muppet: MuppetEnv } }>();

app.post(
  "/documents",
  registerResources((c) => {
    return [
      {
        type: "template", // This tells muppet that this is a dynamic resource
        uri: "https://lorem.{ending}",
        name: "Todo list",
        mimeType: "text/plain",
      },
    ];
  }),
);
