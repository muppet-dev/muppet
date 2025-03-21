import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Hono } from "hono";
import { bridge, muppet } from "muppet";
import express from "express";

const app = new Hono();

// Define your tools, prompts, and resources here
// ...

const mcpServer = muppet(app, {
  name: "My Muppet",
  version: "1.0.0",
});

let transport: SSEServerTransport | null = null;

const server = express().use((req, res, next) => {
  console.log("Request received", req.url);

  next();
});

server.get("/", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);

  const mcp = await mcpServer;

  if (!mcp) {
    throw new Error("MCP not initialized");
  }

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
