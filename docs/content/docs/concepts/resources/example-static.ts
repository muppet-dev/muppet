import { Hono } from "hono";
import { registerResources } from "muppet";

const app = new Hono();

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
