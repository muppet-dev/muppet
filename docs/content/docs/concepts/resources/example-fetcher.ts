import { Hono } from "hono";
import { muppet, type MuppetEnv } from "muppet";

const app = new Hono<{ Bindings: { muppet: MuppetEnv } }>();

muppet(app, {
  name: "example-fetcher",
  version: "0.0.1",
  resources: {
    https: (uri) => {
      return [
        {
          uri,
          text: "Todo list",
          mimeType: "text/plain",
        },
      ];
    },
  },
});
