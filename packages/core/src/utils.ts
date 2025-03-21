import type { Context } from "hono";

/**
 * The unique symbol for the middlewares, which makes it easier to identify them. Not meant to be used directly, unless you're creating a custom middleware.
 */
export const uniqueSymbol = Symbol("muppet");

export const McpPrimitives = {
  RESOURCES: "resources",
  TOOLS: "tools",
  PROMPTS: "prompts",
} as const;

export type McpPrimitivesValue =
  (typeof McpPrimitives)[keyof typeof McpPrimitives];

export type GetRequestInitOptions = {
  message?: unknown;
  c?: Context;
};

export function getRequestInit(options: GetRequestInitOptions) {
  const { message, c } = options;

  let req: RequestInit = {
    method: "POST",
  };

  if (c) {
    req = {
      ...req,
      headers: c.req.header(),
    };
  }

  if (message) {
    req = {
      ...req,
      body: JSON.stringify(message),
      headers: {
        ...req.headers,
        "content-type": "application/json",
      },
    };
  }

  return req;
}
