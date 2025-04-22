import type { Context, Env, Handler, Input } from "hono";
import type { BlankEnv, BlankInput, Next, TypedResponse } from "hono/types";
import { McpPrimitives, uniqueSymbol } from "./utils";
import type { Promisify, Resource } from "./types";
import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";
import type {
  JSONValue,
  SimplifyDeepArray,
  InvalidJSONValue,
  JSONParsed,
} from "hono/utils/types";

type JSONRespondReturn<
  T extends JSONValue | SimplifyDeepArray<unknown> | InvalidJSONValue,
  U extends StatusCode,
> = Response &
  TypedResponse<
    SimplifyDeepArray<T> extends JSONValue
      ? JSONValue extends SimplifyDeepArray<T>
        ? never
        : JSONParsed<T>
      : never,
    U,
    "json"
  >;

export function registerResources<
  E extends Env = BlankEnv,
  P extends string = string,
  I extends Input = BlankInput,
>(
  handler: (c: Context<E, P, I>, next: Next) => Promisify<Resource[]>,
): Handler<E, P, I, JSONRespondReturn<Resource[], ContentfulStatusCode>> {
  // @ts-expect-error
  return Object.assign(handler, {
    [uniqueSymbol]: {
      type: McpPrimitives.RESOURCES,
    },
  });
}
