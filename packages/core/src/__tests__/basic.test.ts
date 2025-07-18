import * as v from "valibot";
import { describe, expect, it } from "vitest";
import {
  type ClientRequest,
  Context,
  type ListPromptsResult,
  Muppet,
} from "../index";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

const dummyTransport = {} as Transport;

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
        name: "static-todo-list",
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
        uriTemplate: "https://lorem.{ending}",
        name: "dynamic-todo-list",
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

  it("should initialize", async () => {
    const message = {
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: { sampling: {}, roots: { listChanged: true } },
        clientInfo: { name: "mcp-inspector", version: "0.7.0" },
      },
    } satisfies ClientRequest;

    const context = new Context(message, { transport: dummyTransport });

    const result = await mcp.dispatch(message, { context });

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      protocolVersion: "2024-11-05",
      serverInfo: {
        name: "My Muppet",
        version: "1.0.0",
      },
      capabilities: { tools: {}, prompts: {}, resources: {} },
    });
  });

  it("should list tools", async () => {
    const message = {
      method: "tools/list",
      params: {},
    } satisfies ClientRequest;

    const context = new Context(message, { transport: dummyTransport });

    const result = await mcp.dispatch(message, { context });

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      tools: [
        {
          name: "hello-world",
          description: "A simple hello world tool",
          inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
            $schema: "http://json-schema.org/draft-07/schema#",
          },
        },
      ],
    });
  });

  it("should call tool", async () => {
    const message = {
      method: "tools/call",
      params: { name: "hello-world", arguments: { name: "muppet" } },
    } satisfies ClientRequest;

    const context = new Context(message, { transport: dummyTransport });

    const result = await mcp.dispatch(message, { context });

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      content: [
        {
          type: "text",
          text: "Hello muppet!",
        },
      ],
    });
  });

  it("should list prompts", async () => {
    const message = {
      method: "prompts/list",
      params: {},
    } satisfies ClientRequest;

    const context = new Context(message, { transport: dummyTransport });

    const result = await mcp.dispatch(message, { context });

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      prompts: [
        {
          name: "simple-prompt",
          arguments: [{
            name: "name",
            required: true,
          }],
        },
      ],
    } as ListPromptsResult);
  });

  it("should get prompt", async () => {
    const message = {
      method: "prompts/get",
      params: { name: "simple-prompt", arguments: { name: "muppet" } },
    } satisfies ClientRequest;

    const context = new Context(message, { transport: dummyTransport });

    const result = await mcp.dispatch(message, { context });

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      messages: [
        {
          role: "user",
          content: { type: "text", text: "This is a simple prompt for muppet" },
        },
      ],
    });
  });

  it("should list resources", async () => {
    const message = {
      method: "resources/list",
      params: {},
    } satisfies ClientRequest;

    const context = new Context(message, { transport: dummyTransport });

    const result = await mcp.dispatch(message, { context });

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      resources: [
        {
          uri: "https://lorem.ipsum",
          name: "static-todo-list",
          mimeType: "text/plain",
        },
      ],
    });
  });

  it("should list template resources", async () => {
    const message = {
      method: "resources/templates/list",
      params: {},
    } satisfies ClientRequest;

    const context = new Context(message, { transport: dummyTransport });
    const result = await mcp.dispatch(message, { context });

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      resourceTemplates: [
        {
          uriTemplate: "https://lorem.{ending}",
          name: "dynamic-todo-list",
          mimeType: "text/plain",
        },
      ],
    });
  });

  it("should read the static resource", async () => {
    const message = {
      method: "resources/read",
      params: { uri: "https://lorem.ipsum" },
    } satisfies ClientRequest;

    const context = new Context(message, { transport: dummyTransport });

    const result = await mcp.dispatch(message, { context });

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      contents: [{ uri: "task1", text: "This is a fixed task" }],
    });
  });

  it("should read the dynamic resource", async () => {
    const message = {
      method: "resources/read",
      params: { uri: "https://lorem.muppet" },
    } satisfies ClientRequest;

    const context = new Context(message, { transport: dummyTransport });

    const result = await mcp.dispatch(message, { context });

    expect(result).toBeDefined();
    expect(result).toMatchObject({
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
    });
  });

  it("should respond with completions", async () => {
    const message = {
      method: "completion/complete",
      params: {
        argument: { name: "name", value: "Aditya" },
        ref: { type: "ref/prompt", name: "Simple Prompt" },
      },
    } satisfies ClientRequest;

    const context = new Context(message, { transport: dummyTransport });

    const result = await mcp.dispatch(message, { context });

    expect(result).toBeUndefined();
  });
});
