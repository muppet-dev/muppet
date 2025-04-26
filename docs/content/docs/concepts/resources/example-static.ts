import { Hono } from "hono";
import { type MuppetEnv, registerResources } from "muppet";

const app = new Hono<{ Bindings: { muppet: MuppetEnv } }>();

app.post(
  "/documents",
  registerResources((c) => {
    return [
      {
        uri: "https://lorem.ipsum",
        name: "Todo list",
        mimeType: "text/plain",
      },
    ];
  }),
);
