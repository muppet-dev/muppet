import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { muppet } from "muppet";

const app = new Hono();

app.get(
  "/products",
  describeRoute({
    summary: "Get all products",
    description: "This endpoint returns a list of all products.",
  }),
  async (c) => {
    return c.json([
      {
        id: 1,
        name: "Product 1",
        price: 10.0,
      },
      {
        id: 2,
        name: "Product 2",
        price: 20.0,
      },
    ]);
  },
);

muppet(app, {
  name: "hono-openapi-mcp",
  version: "0.0.1",
});
