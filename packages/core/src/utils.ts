/**
 * The unique symbol for the middlewares, which makes it easier to identify them. Not meant to be used directly, unless you're creating a custom middleware.
 */
export const uniqueSymbol = Symbol("muppet");

export const McpPrimitives = {
  RESOURCES: "resources",
  TOOLS: "tools",
  PROMPTS: "prompts",
};
