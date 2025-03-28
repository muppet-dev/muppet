import { fromOpenAPI } from "../openapi";
import { describe, it, expect } from "vitest";

describe("instance from OpenAPI", async () => {
  const instance = fromOpenAPI({
    openapi: "3.1.0",
    info: {
      title: "Muppet",
      description: "API for greeting an creating users",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:3000", description: "Local server" }],
    paths: {
      "/zod": {
        get: {
          responses: {
            "200": {
              description: "Successful greeting response",
              content: {
                "text/plain": {
                  schema: { type: "string", example: "Hello Steven!" },
                },
              },
            },
            "400": {
              description: "Zod Error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Bad Request" },
                },
              },
            },
          },
          operationId: "getZod",
          parameters: [
            {
              in: "query",
              name: "name",
              schema: { $ref: "#/components/schemas/name" },
            },
          ],
          description: "Say hello to the user",
        },
        post: {
          responses: {
            "200": {
              description: "Successful user creation response",
              content: {
                "text/plain": {
                  schema: {
                    type: "string",
                    example: "Hello Steven! Your id is 123",
                  },
                },
              },
            },
          },
          operationId: "postZod",
          parameters: [
            {
              in: "query",
              name: "name",
              schema: { $ref: "#/components/schemas/name" },
            },
          ],
          description: "Create a new user",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { id: { type: "number", example: 123 } },
                  required: ["id"],
                },
              },
            },
          },
        },
      },
      "/valibot": {
        get: {
          responses: {
            "200": {
              description: "Successful greeting response",
              content: { "text/plain": { schema: { type: "string" } } },
            },
            "400": {
              description: "Zod Error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Bad Request" },
                },
              },
            },
          },
          operationId: "getValibot",
          parameters: [
            {
              in: "query",
              name: "name",
              schema: { type: "string" },
              required: true,
            },
          ],
          description: "Say hello to the user",
        },
        post: {
          responses: {
            "200": {
              description: "Successful user creation response",
              content: {
                "text/plain": {
                  schema: {
                    type: "string",
                    example: "Hello Steven! Your id is 123",
                  },
                },
              },
            },
          },
          operationId: "postValibot",
          parameters: [
            {
              in: "query",
              name: "name",
              schema: { type: "string" },
              required: true,
            },
          ],
          description: "Create a new user",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { id: { type: "number" } },
                  required: ["id"],
                  additionalProperties: false,
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        "Bad Request": {
          type: "object",
          properties: {
            status: { type: "number", const: 400 },
            message: { type: "string" },
          },
          required: ["status", "message"],
        },
        name: { type: "string", example: "Steven", description: "User Name" },
      },
    },
  });

  it("should return an instance", () => {
    expect(instance).toBeDefined();
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
      serverInfo: {
        name: "Muppet",
        version: "1.0.0",
      },
      capabilities: { tools: {} },
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
          name: "getZod",
          description: "Say hello to the user",
          inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            additionalProperties: false,
          },
        },
        {
          name: "postZod",
          description: "Create a new user",
          inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            additionalProperties: false,
          },
        },
        {
          name: "getValibot",
          description: "Say hello to the user",
          inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
            additionalProperties: false,
          },
        },
        {
          name: "postValibot",
          description: "Create a new user",
          inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
            additionalProperties: false,
          },
        },
      ],
    });
  });

  it.skip("should call the tool", async () => {
    const response = await instance?.request("/tools/call", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          _meta: { progressToken: 0 },
          name: describe.name,
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
      contents: [
        {
          type: "text",
          text: "Hello World!",
        },
      ],
    });
  });
});
