import type { Env, Handler, Input } from "hono";
import type { BlankEnv, BlankInput, TypedResponse } from "hono/types";
import { McpPrimitives, uniqueSymbol } from "./utils";

export function registerResources<
  E extends Env = BlankEnv,
  P extends string = string,
  I extends Input = BlankInput,
>(
  handler: Handler<E, P, I, TypedResponse<"json", 200>>,
): Handler<E, P, I, TypedResponse<"json", 200>> {
  return Object.assign(handler, {
    [uniqueSymbol]: {
      type: McpPrimitives.RESOURCES,
    },
  });
}
