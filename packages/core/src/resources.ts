import type { Env, Handler, Input } from "hono";
import type { BlankEnv, BlankInput, TypedResponse } from "hono/types";
import { McpPrimitives, uniqueSymbol } from "./utils";
import type { Resource } from "./types";
import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";
import type {
  JSONValue,
  SimplifyDeepArray,
  InvalidJSONValue,
  JSONParsed,
} from "hono/utils/types";

/**
 * @template T - The type of the JSON value or simplified unknown type.
 * @template U - The type of the status code.
 *
 * @returns {Response & TypedResponse<SimplifyDeepArray<T> extends JSONValue ? (JSONValue extends SimplifyDeepArray<T> ? never : JSONParsed<T>) : never, U, 'json'>} - The response after rendering the JSON object, typed with the provided object and status code types.
 */
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
  handler: Handler<
    E,
    P,
    I,
    JSONRespondReturn<Resource[], ContentfulStatusCode>
  >,
): Handler<E, P, I, JSONRespondReturn<Resource[], ContentfulStatusCode>> {
  return Object.assign(handler, {
    [uniqueSymbol]: {
      type: McpPrimitives.RESOURCES,
    },
  });
}
