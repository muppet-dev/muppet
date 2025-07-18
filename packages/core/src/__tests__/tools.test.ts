import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import z from "zod";
import {
  describeTool,
  muppet,
  mValidator,
  type ToolResponseType,
} from "../index";

describe("tools", async () => {
  describe("with json validation", async () => {
    const about = {
      name: "json",
      description: "with json validation",
    };

    const app = new Hono().post(
      "/",
      describeTool(about),
      mValidator(
        "json",
        z.object({
          search: z.string().optional(),
        }),
      ),
      (c) => {
        return c.json<ToolResponseType>([
          {
            type: "text",
            text: "Hello World!",
          },
        ]);
      },
    );

    const instance = await muppet(app, { name: "basic", version: "1.0.0" });

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
            ...about,
            inputSchema: {
              type: "object",
              properties: { search: { type: "string" } },
              additionalProperties: false,
              $schema: "http://json-schema.org/draft-07/schema#",
            },
          },
        ],
      });
    });

    it("should call the tool", async () => {
      const response = await instance?.request("/tools/call", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            _meta: { progressToken: 0 },
            name: about.name,
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
            text: "Hello World!",
          },
        ],
      });
    });
  });

  describe("with query validation", async () => {
    const about = {
      name: "query",
      description: "with query validation",
    };

    const app = new Hono().get(
      "/",
      describeTool(about),
      mValidator(
        "query",
        z.object({
          search: z.string().optional(),
        }),
      ),
      (c) => {
        return c.json<ToolResponseType>([
          {
            type: "text",
            text: "Hello World!",
          },
        ]);
      },
    );

    const instance = await muppet(app, { name: "basic", version: "1.0.0" });

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
            ...about,
            inputSchema: {
              type: "object",
              properties: { search: { type: "string" } },
              additionalProperties: false,
              $schema: "http://json-schema.org/draft-07/schema#",
            },
          },
        ],
      });
    });

    it("should call the tool", async () => {
      const response = await instance?.request("/tools/call", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            _meta: { progressToken: 0 },
            name: about.name,
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
            text: "Hello World!",
          },
        ],
      });
    });
  });

  describe("with query and json validation", async () => {
    const about = {
      name: "query & json",
      description: "with query & json validation",
    };

    const app = new Hono().post(
      "/",
      describeTool(about),
      mValidator(
        "query",
        z.object({
          search: z.string().optional(),
        }),
      ),
      mValidator(
        "json",
        z.object({
          name: z.string(),
        }),
      ),
      (c) => {
        return c.json<ToolResponseType>([
          {
            type: "text",
            text: "Hello World!",
          },
        ]);
      },
    );

    const instance = await muppet(app, { name: "basic", version: "1.0.0" });

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
            ...about,
            inputSchema: {
              type: "object",
              properties: {
                search: { type: "string" },
                name: { type: "string" },
              },
              required: ["name"],
              additionalProperties: false,
              $schema: "http://json-schema.org/draft-07/schema#",
            },
          },
        ],
      });
    });

    it("should call the tool", async () => {
      const response = await instance?.request("/tools/call", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            _meta: { progressToken: 0 },
            name: about.name,
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
            text: "Hello World!",
          },
        ],
      });
    });
  });
});
