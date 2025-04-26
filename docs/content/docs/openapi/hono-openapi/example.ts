import { Hono } from "hono";
import { describeRoute, uniqueSymbol } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";
import { muppet, type MuppetEnv } from "muppet";
import z from "zod";

const app = new Hono<{ Bindings: { muppet: MuppetEnv } }>();

app.get(
  "/products",
  describeRoute({
    summary: "Get all products",
    description: "This endpoint returns a list of all products.",
  }),
  zValidator("query", z.object({ page: z.number().optional() })),
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
  // By passing this, muppet will scan the hono-openapi middlewares too
  symbols: [uniqueSymbol],
});
