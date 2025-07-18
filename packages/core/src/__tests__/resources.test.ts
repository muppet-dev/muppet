import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { muppet, type Resource, registerResources } from "../index";

describe("resources", async () => {
  describe("only static resources", async () => {
    const resource = {
      uri: "https://lorem.ipsum",
      name: "Returns Lorem ipsum",
      mimeType: "text/plain",
    };

    const resolvedResource = { uri: "text:something", text: "Lorem ipsum" };

    const app = new Hono().post(
      "/",
      registerResources(() => {
        return [resource];
      }),
    );

    const instance = await muppet(app, {
      name: "basic",
      version: "1.0.0",
      resources: {
        https: () => [resolvedResource],
      },
    });

    it("should list resources", async () => {
      const response = await instance?.request("/resources/list", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
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
        resources: [resource],
      });
    });

    it("should read the resource", async () => {
      const response = await instance?.request("/resources/read", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "resources/read",
          params: {
            uri: resource.uri,
          },
        }),
        headers: {
          "content-type": "application/json",
        },
      });

      const json = await response?.json();

      expect(json).toBeDefined();
      expect(json.result).toMatchObject({
        contents: [resolvedResource],
      });
    });
  });

  describe("only dynamic resources", async () => {
    const resource: Resource = {
      type: "template",
      uri: "https://lorem.{ending}",
      name: "Returns Lorem ipsum",
      mimeType: "text/plain",
    };

    const resolvedResource = { uri: "text:something", text: "Lorem ipsum" };

    const app = new Hono().post(
      "/",
      registerResources(() => {
        return [resource];
      }),
    );

    const instance = await muppet(app, {
      name: "basic",
      version: "1.0.0",
      resources: {
        https: () => [resolvedResource],
      },
    });

    it("should list template resources", async () => {
      const response = await instance?.request("/resources/templates/list", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
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
            uriTemplate: resource.uri,
            name: resource.name,
            mimeType: resource.mimeType,
          },
        ],
      });
    });

    it("should read the template resource", async () => {
      const response = await instance?.request("/resources/read", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "resources/read",
          params: {
            uri: "https://lorem.random",
          },
        }),
        headers: {
          "content-type": "application/json",
        },
      });

      const json = await response?.json();

      expect(json).toBeDefined();
      expect(json.result).toMatchObject({
        contents: [resolvedResource],
      });
    });
  });

  describe("mixed resources", async () => {
    const mixedResources: Resource[] = [
      {
        uri: "https://lorem.ipsum",
        name: "Returns Lorem ipsum",
        mimeType: "text/plain",
      },
      {
        type: "template",
        uri: "https://lorem.{ending}",
        name: "Returns Lorem ipsum",
        mimeType: "text/plain",
      },
    ];

    const resolvedResource = { uri: "text:something", text: "Lorem ipsum" };

    const app = new Hono().post(
      "/",
      registerResources(() => {
        return mixedResources;
      }),
    );

    const instance = await muppet(app, {
      name: "basic",
      version: "1.0.0",
      resources: {
        https: () => [resolvedResource],
      },
    });

    it("should list static resources", async () => {
      const response = await instance?.request("/resources/list", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
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
        resources: [mixedResources[0]],
      });
    });

    it("should read the static resource", async () => {
      const response = await instance?.request("/resources/read", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "resources/read",
          params: {
            uri: mixedResources[0].uri,
          },
        }),
        headers: {
          "content-type": "application/json",
        },
      });

      const json = await response?.json();

      expect(json).toBeDefined();
      expect(json.result).toMatchObject({
        contents: [resolvedResource],
      });
    });

    it("should list template resources", async () => {
      const response = await instance?.request("/resources/templates/list", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
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
            uriTemplate: mixedResources[1].uri,
            name: mixedResources[1].name,
            mimeType: mixedResources[1].mimeType,
          },
        ],
      });
    });

    it("should read the template resource", async () => {
      const response = await instance?.request("/resources/read", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "resources/read",
          params: {
            uri: mixedResources[0].uri,
          },
        }),
        headers: {
          "content-type": "application/json",
        },
      });

      const json = await response?.json();

      expect(json).toBeDefined();
      expect(json.result).toMatchObject({
        contents: [resolvedResource],
      });
    });
  });
});
