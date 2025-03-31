import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import z from "zod";
import {
  describeTool,
  describePrompt,
  mValidator,
  type ToolResponseType,
  registerResources,
  type PromptResponseType,
  muppet,
} from "../index";

describe("basic", async () => {
  const app = new Hono()
    .post(
      "/hello",
      describeTool({
        name: "Hello World",
        description: "A simple hello world route",
      }),
      mValidator(
        "json",
        z.object({
          name: z.string(),
        }),
      ),
      (c) => {
        const payload = c.req.valid("json");
        return c.json<ToolResponseType>([
          {
            type: "text",
            text: `Hello ${payload.name}!`,
          },
        ]);
      },
    )
    .post(
      "/documents",
      registerResources((c) => {
        return c.json([
          {
            uri: "https://lorem.ipsum",
            name: "Todo list",
            mimeType: "text/plain",
          },
          {
            type: "template",
            uri: "https://lorem.{ending}",
            name: "Todo list",
            mimeType: "text/plain",
          },
        ]);
      }),
    )
    .post(
      "/simple",
      describePrompt({ name: "Simple Prompt" }),
      mValidator(
        "json",
        z.object({
          name: z.string(),
        }),
      ),
      (c) => {
        const { name } = c.req.valid("json");
        return c.json<PromptResponseType>([
          {
            role: "user",
            content: {
              type: "text",
              text: `This is a simple prompt for ${name}`,
            },
          },
        ]);
      },
    );

  const serverInfo = {
    name: "My Muppet",
    version: "1.0.0",
  };

  // Creating a mcp using muppet
  const instance = await muppet(app, {
    ...serverInfo,
    resources: {
      https: (uri) => {
        if (uri === "https://lorem.ipsum")
          return [
            {
              uri: "task1",
              text: "This is a fixed task",
            },
          ];

        return [
          {
            uri: "task1",
            text: "This is dynamic task",
          },
          {
            uri: "task2",
            text: "Could be fetched from a DB",
          },
        ];
      },
    },
  });

  it("should initialize", async () => {
    const response = await instance?.request("/initialize", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: { sampling: {}, roots: { listChanged: true } },
          clientInfo: { name: "mcp-inspector", version: "0.7.0" },
        },
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const json = await response?.json();

    expect(json).toBeDefined();
    expect(json.result).toMatchObject({
      protocolVersion: "2024-11-05",
      serverInfo,
      capabilities: { tools: {}, prompts: {}, resources: {} },
    });
  });

  it("should list tools", async () => {
    const response = await instance?.request("/tools/list", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const json = await response?.json();

    expect(json).toBeDefined();
    expect(json.result).toMatchObject({
      tools: [
        {
          name: "Hello World",
          description: "A simple hello world route",
          inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
            additionalProperties: false,
            $schema: "http://json-schema.org/draft-07/schema#",
          },
        },
      ],
    });
  });

  it("should call tool", async () => {
    const response = await instance?.request("/tools/call", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          _meta: { progressToken: 0 },
          name: "Hello World",
          arguments: { name: "muppet" },
        },
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const json = await response?.json();

    expect(json).toBeDefined();
    expect(json.result).toMatchObject({
      content: [
        {
          type: "text",
          text: "Hello muppet!",
        },
      ],
    });
  });

  it("should list prompts", async () => {
    const response = await instance?.request("/prompts/list", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "prompts/list",
        params: {},
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const json = await response?.json();

    expect(json).toBeDefined();
    expect(json.result).toMatchObject({
      prompts: [
        {
          name: "Simple Prompt",
          arguments: [{ name: "name", required: true }],
          method: "POST",
          schema: {
            json: {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
              additionalProperties: false,
              $schema: "http://json-schema.org/draft-07/schema#",
            },
          },
        },
      ],
    });
  });

  it("should get prompt", async () => {
    const response = await instance?.request("/prompts/get", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "prompts/get",
        params: { name: "Simple Prompt", arguments: { name: "Muppet" } },
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const json = await response?.json();

    expect(json).toBeDefined();
    expect(json.result).toMatchObject({
      messages: [
        {
          role: "user",
          content: { type: "text", text: "This is a simple prompt for Muppet" },
        },
      ],
    });
  });

  it("should list resources", async () => {
    const response = await instance?.request("/resources/list", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "resources/list",
        params: {},
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const json = await response?.json();

    expect(json).toBeDefined();
    expect(json.result).toMatchObject({
      resources: [
        {
          uri: "https://lorem.ipsum",
          name: "Todo list",
          mimeType: "text/plain",
        },
      ],
    });
  });

  it("should list template resources", async () => {
    const response = await instance?.request("/resources/templates/list", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 6,
        method: "resources/templates/list",
        params: {},
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const json = await response?.json();

    expect(json).toBeDefined();
    expect(json.result).toMatchObject({
      resourceTemplates: [
        {
          uriTemplate: "https://lorem.{ending}",
          name: "Todo list",
          mimeType: "text/plain",
        },
      ],
    });
  });

  it("should read the resource", async () => {
    const response = await instance?.request("/resources/read", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 5,
        method: "resources/read",
        params: { uri: "https://lorem.ipsum" },
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const json = await response?.json();

    expect(json).toBeDefined();
    expect(json.result).toMatchObject({
      contents: [{ uri: "task1", text: "This is a fixed task" }],
    });
  });

  it("should respond with completions", async () => {
    const response = await instance?.request("/completion/complete", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "completion/complete",
        params: {
          argument: { name: "name", value: "Aditya" },
          ref: { type: "ref/prompt", name: "Simple Prompt" },
        },
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const json = await response?.json();

    expect(json).toBeDefined();
    expect(json.result).toMatchObject({
      completion: { values: [], total: 0, hasMore: false },
    });
  });
});
