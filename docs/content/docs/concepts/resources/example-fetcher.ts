import { Hono } from "hono";
import { muppet } from "muppet";

const app = new Hono();

muppet(app, {
  name: "example-fetcher",
  version: "0.0.1",
  resources: {
    https: (uri) => {
      return [
        {
          uri,
          name: "Todo list",
          mimeType: "text/plain",
        },
      ];
    },
  },
});
