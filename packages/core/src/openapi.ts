import type { OpenAPIV3_1 } from "openapi-types";
import type { MuppetConfiguration, ToolsConfiguration } from "./types";
import { createMuppetServer, generateKey, mergeSchemas } from "./muppet";
import { Hono } from "hono";
import { proxy } from "hono/proxy";
import type { JSONSchema7 } from "json-schema";

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
        const schema: Record<string, JSONSchema7 | undefined> = {};

        if (
          typeof operation === "object" &&
          "parameters" in operation &&
          operation.parameters
        ) {
          for (const parameter of operation.parameters) {
            if ("$ref" in parameter) {
            } else if ("schema" in parameter) {
              if (!parameter.schema) continue;

              schema[parameter.in] = {
                type: "object",
                // @ts-expect-error
                properties: {
                  ...(schema[parameter.in]?.properties ?? {}),
                  [parameter.name]: parameter.schema,
                },
                // @ts-expect-error
                required: [
                  ...(schema[parameter.in]?.required || []),
                  parameter.required ? parameter.name : undefined,
                ].filter(Boolean),
                additionalProperties: false,
              };
            }
          }
        }

        const key =
          (typeof operation === "object" && "operationId" in operation
            ? operation.operationId
            : undefined) ?? generateKey(method, path);

        tools[key] = {
          name: key,
          description:
            typeof operation === "object" && "description" in operation
              ? operation.description
              : undefined,
          path,
          method,
          inputSchema: mergeSchemas(schema) ?? {},
          schema,
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
