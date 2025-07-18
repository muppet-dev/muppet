import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { type ClientRequest, Context, Muppet } from "../index";

describe("basic", async () => {
  const mcp = new Muppet({ name: "My Muppet", version: "1.0.0" })
    .tool(
      {
        name: "hello-world",
        description: "A simple hello world tool",
        inputSchema: v.object({
          name: v.string(),
        }),
      },
      (c) => {
        const payload = c.message.params.arguments;
        return {
          content: [
            {
              type: "text",
              text: `Hello ${payload.name}!`,
            },
          ],
        };
      },
    )
    .prompt(
      {
        name: "simple-prompt",
        arguments: {
          name: { validation: v.string() },
        },
      },
      (c) => {
        const { name } = c.message.params.arguments;

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `This is a simple prompt for ${name}`,
              },
            },
          ],
        };
      },
    )
    .resource(
      {
        uri: "https://lorem.ipsum",
        name: "Todo list",
        mimeType: "text/plain",
      },
      () => ({
        contents: [
          {
            uri: "task1",
            text: "This is a fixed task",
          },
        ],
      }),
    )
    .resource(
      {
        uri: "https://lorem.{ending}",
        name: "Todo list",
        mimeType: "text/plain",
      },
      () => ({
        contents: [
          {
            uri: "task1",
            text: "This is dynamic task",
          },
          {
            uri: "task2",
            text: "Could be fetched from a DB",
          },
        ],
      }),
    );

  it.only("should initialize", async () => {
    const message = {
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: { sampling: {}, roots: { listChanged: true } },
        clientInfo: { name: "mcp-inspector", version: "0.7.0" },
      },
    } satisfies ClientRequest;

    const context = new Context(message, { transport: {} });

    const response = await mcp.dispatch(message, { context });

    expect(response).toBeDefined();
    expect(response).toMatchObject({
      protocolVersion: "2024-11-05",
      serverInfo: {
        name: "My Muppet",
        version: "1.0.0",
      },
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
