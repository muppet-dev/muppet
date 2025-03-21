import type { Env, Handler, Input } from "hono";
import type { BlankEnv, BlankInput, TypedResponse } from "hono/types";
import { McpPrimitives, uniqueSymbol } from "./utils";
import type { Resource } from "./types";

export function registerResources<
  E extends Env = BlankEnv,
  P extends string = string,
  I extends Input = BlankInput,
>(
  handler: Handler<E, P, I, TypedResponse<Resource[], 200>>,
): Handler<E, P, I, TypedResponse<Resource[], 200>> {
  return Object.assign(handler, {
    [uniqueSymbol]: {
      type: McpPrimitives.RESOURCES,
    },
  });
}
