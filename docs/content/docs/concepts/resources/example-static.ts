import { Hono } from "hono";
import { registerResources, type Resource } from "muppet";

const app = new Hono();

app.post(
  "/documents",
  registerResources((c) => {
    return c.json<Resource[]>([
      {
        uri: "https://lorem.ipsum",
        name: "Todo list",
        mimeType: "text/plain",
      },
    ]);
  }),
);
