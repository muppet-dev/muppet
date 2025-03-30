import { Hono } from "hono";
import { muppet } from "muppet";

const app = new Hono();

// Define your tools, prompts, and resources here
// ...

const instance = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
});
