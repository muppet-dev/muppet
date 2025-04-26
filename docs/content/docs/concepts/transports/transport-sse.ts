import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Hono } from "hono";
import { bridge, muppet, type MuppetEnv } from "muppet";
import express from "express";

const app = new Hono<{ Bindings: { muppet: MuppetEnv } }>();

// Define your tools, prompts, and resources here
// ...

const mcp = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
});

let transport: SSEServerTransport | null = null;

const server = express().use((req, res, next) => {
  console.log("Request received", req.url);
  next();
});

server.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);

  bridge({
    mcp,
    transport,
  });
});

server.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

server.listen(3001);
