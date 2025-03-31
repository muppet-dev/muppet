import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import z from "zod";
import {
  describePrompt,
  mValidator,
  type PromptResponseType,
  muppet,
} from "../index";

describe("prompts", async () => {
  describe("with json validation", async () => {
    const about = {
      name: "json",
      description: "with json validation",
    };

    const app = new Hono().post(
      "/",
      describePrompt(about),
      mValidator(
        "json",
        z.object({
          search: z.string().optional(),
        }),
      ),
      (c) => {
        return c.json<PromptResponseType>([
          {
            role: "user",
            content: {
              type: "text",
              text: "Hello World!",
            },
          },
        ]);
      },
    );

    const instance = await muppet(app, { name: "basic", version: "1.0.0" });

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
        prompts: [about],
      });
    });

    it("should get the prompt", async () => {
      const response = await instance?.request("/prompts/get", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "prompts/get",
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
        description: about.description,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "Hello World!",
            },
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
      describePrompt(about),
      mValidator(
        "query",
        z.object({
          search: z.string().optional(),
        }),
      ),
      (c) => {
        return c.json<PromptResponseType>([
          {
            role: "user",
            content: {
              type: "text",
              text: "Hello World!",
            },
          },
        ]);
      },
    );

    const instance = await muppet(app, { name: "basic", version: "1.0.0" });

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
        prompts: [about],
      });
    });

    it("should get the prompt", async () => {
      const response = await instance?.request("/prompts/get", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "prompts/get",
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
        description: about.description,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "Hello World!",
            },
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
      describePrompt(about),
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
        return c.json<PromptResponseType>([
          {
            role: "user",
            content: {
              type: "text",
              text: "Hello World!",
            },
          },
        ]);
      },
    );

    const instance = await muppet(app, { name: "basic", version: "1.0.0" });

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
        prompts: [about],
      });
    });

    it("should get the prompt", async () => {
      const response = await instance?.request("/prompts/get", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "prompts/get",
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
        description: about.description,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "Hello World!",
            },
          },
        ],
      });
    });
  });
});
