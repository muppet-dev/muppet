import type { OpenAPIV3_1 } from "openapi-types";
import type { MuppetConfiguration, ToolsConfiguration } from "./types";
import { createMuppetServer } from "./muppet";
import { Hono } from "hono";
import { proxy } from "hono/proxy";

export function fromOpenAPI(specs: OpenAPIV3_1.Document) {
  const config: MuppetConfiguration = {
    name: specs.info.title,
    version: specs.info.version,
  };

  const tools: ToolsConfiguration = {};

  if (specs.paths)
    for (const [path, payload] of Object.entries(specs.paths)) {
      if (!payload) continue;

      for (const [method, operation] of Object.entries(payload)) {
        tools[path] = {
          path,
          method,
          inputSchema: {},
        };
      }
    }

  const originServer = specs.servers?.[0]?.url || "http://localhost:3000";
  const app = new Hono().all("/:path", async (c) => {
    return proxy(`${originServer}/${c.req.param("path")}`, c.req);
  });

  return createMuppetServer({
    config,
    specs: { tools },
    app,
  });
}
