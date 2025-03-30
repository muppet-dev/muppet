import { Hono } from "hono";
import { registerResources, type Resource } from "muppet";

const app = new Hono();

app.post(
  "/documents",
  registerResources((c) => {
    return c.json<Resource[]>([
      {
        type: "template", // This tells muppet that this is a dynamic resource
        uri: "https://lorem.{ending}",
        name: "Todo list",
        mimeType: "text/plain",
      },
    ]);
  }),
);
