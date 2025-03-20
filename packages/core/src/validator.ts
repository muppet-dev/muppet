import { type Hook, sValidator } from "@hono/standard-validator";
import { toJsonSchema } from "@standard-community/standard-json";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Env, Input, MiddlewareHandler, ValidationTargets } from "hono";
import type { HasUndefined } from "./types.js";
import { uniqueSymbol } from "./utils.js";

/**
 * Create a validator middleware. Use this only for muppet tools.
 * @param schema Standard Schema
 * @param hook Hook for validation
 * @returns Middleware handler
 */
export function mValidator<
  Schema extends StandardSchemaV1,
  E extends Env,
  P extends string,
  In = StandardSchemaV1.InferInput<Schema>,
  Out = StandardSchemaV1.InferOutput<Schema>,
  I extends Input = {
    in: HasUndefined<In> extends true
      ? {
          json?: In extends ValidationTargets["json"]
            ? In
            : { [K2 in keyof In]?: ValidationTargets["json"][K2] };
        }
      : {
          json: In extends ValidationTargets["json"]
            ? In
            : { [K2 in keyof In]: ValidationTargets["json"][K2] };
        };
    out: { json: Out };
  },
  V extends I = I,
>(
  schema: Schema,
  hook?: Hook<StandardSchemaV1.InferOutput<Schema>, E, P, "json">,
): MiddlewareHandler<E, P, V> {
  const middleware = sValidator("json", schema, hook);

  // @ts-expect-error not typed well
  return Object.assign(middleware, {
    [uniqueSymbol]: {
      resolver: (options?: Record<string, unknown>) => ({
        schema: toJsonSchema(schema, options),
      }),
    },
  });
}
