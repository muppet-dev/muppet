import { sValidator } from "@hono/standard-validator";
import {
  ErrorCode,
  InitializeRequestSchema,
  CallToolRequestSchema,
  LATEST_PROTOCOL_VERSION,
  RequestSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "@modelcontextprotocol/sdk/types.js";
import { Hono } from "hono";
import type { BlankEnv, BlankSchema, Env, Schema } from "hono/types";
import type {
  MuppetConfiguration,
  ToolConfigurationDocument,
  ToolHandlerResponse,
} from "./types";
import { uniqueSymbol } from "./utils";
import type { Logger } from "pino";

export async function muppet<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(hono: Hono<E, S, P>, config: MuppetConfiguration) {
  let messageId = -1;
  const { transport, logger: _logger } = config;

  let logger: Logger | undefined;

  if (_logger) {
    const pino = await import("pino").then((pino) => pino.default);

    if (_logger.options) {
      logger = pino(_logger.options, _logger.stream);
    } else if (_logger.stream) {
      logger = pino(_logger.stream);
    } else {
      logger = pino();
    }
  }

  const tools = await generateToolSpecs(hono);
  const hasTools = Object.keys(tools).length > 0;

  const mcp = new Hono();

  mcp.post(
    "/initialize",
    sValidator("json", InitializeRequestSchema),
    async (c) => {
      messageId = -1;
      const { params } = c.req.valid("json");

      return c.json({
        result: {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(
            params?.protocolVersion,
          )
            ? params.protocolVersion
            : LATEST_PROTOCOL_VERSION,
          serverInfo: {
            name: config.name,
            version: config.version,
          },
          capabilities: {
            tools: hasTools ? {} : undefined,
          },
        },
      });
    },
  );

  mcp.post("/tools/list", (c) => {
    if (!hasTools) {
      throw new Error("No tools available");
    }

    return c.json({
      result: {
        tools: Object.entries(tools).map(([path, config]) => ({
          name: path,
          ...config,
          inputSchema: config.inputSchema ?? {},
        })),
      },
    });
  });

  mcp.post(
    "/tools/call",
    sValidator("json", CallToolRequestSchema),
    async (c) => {
      const { params } = c.req.valid("json");

      logger?.info({ hasTools, params }, "hasTools");

      if (!hasTools) {
        throw new Error("No tools available");
      }

      for (const [path, config] of Object.entries(tools)) {
        logger?.info({ path, config }, "Path and config");

        if (params.name === path || params.name === config.name) {
          const req = new Request(`http://muppet.mcp${path}`, {
            method: "POST",
            body: JSON.stringify(params.arguments),
            headers: {
              "content-type": "application/json",
            },
          });

          const response = await hono.fetch(req);

          const tmp = await response.json();

          logger?.info({ tmp }, "Response payload");

          return c.json({ result: tmp });
        }
      }

      logger?.error("Tool not found");

      throw new Error("Tool not found");
    },
  );

  mcp.post("/notifications/initialized", (c) => {
    return c.body(null, 204);
  });

  mcp.post("/ping", (c) => {
    return c.json({ result: {} });
  });

  mcp.notFound((c) => {
    logger?.info("Method not found");

    return c.json({
      error: {
        code: ErrorCode.MethodNotFound,
        message: "Method not found",
      },
    });
  });

  mcp.onError((err, c) => {
    logger?.error({ err }, "Internal error");

    return c.json({
      error: {
        // @ts-expect-error
        code: Number.isSafeInteger(err.code)
          ? // @ts-expect-error
            err.code
          : ErrorCode.InternalError,
        message: err.message ?? "Internal error",
      },
    });
  });

  // Binding it with the transport
  transport.onclose = () => {
    logger?.info("Connection closed");
  };

  transport.onmessage = async (message) => {
    logger?.info(
      { message, string: JSON.stringify(message) },
      "Received message",
    );

    const validatedMessage = RequestSchema.parse(message);

    const response = await mcp.fetch(
      new Request(`http://muppet.mcp/${validatedMessage.method}`, {
        method: "POST",
        body: JSON.stringify(message),
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    // If there's no payload, we don't need to send a response. Eg. Notifications
    if (response.status === 204) return;

    const payload = await response.json();

    logger?.info({ payload }, "Response payload");

    messageId++;
    logger?.info({ messageId });

    await transport
      .send({
        ...payload,
        jsonrpc: "2.0",
        id: messageId,
      })
      .then(() => logger?.info("Sent response"))
      .catch((error) => logger?.error(error, "Failed to send cancellation"));
  };

  transport.start();
}

export async function generateToolSpecs<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  P extends string = string,
>(hono: Hono<E, S, P>) {
  const configuration: ToolConfigurationDocument = {};

  for (const route of hono.routes) {
    if (!(uniqueSymbol in route.handler)) continue;

    const { resolver } = route.handler[uniqueSymbol] as ToolHandlerResponse;

    const result = await resolver();

    if (result)
      configuration[route.path] = {
        ...(configuration[route.path] ?? {}),
        ...result,
      };
  }

  return configuration;
}
