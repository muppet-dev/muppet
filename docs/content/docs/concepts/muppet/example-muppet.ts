import { Hono } from "hono";
import { muppet, type MuppetEnv } from "muppet";

const app = new Hono<{ Bindings: { muppet: MuppetEnv } }>();

// Define your tools, prompts, and resources here
// ...

const instance = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
});
