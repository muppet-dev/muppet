import { type Hook, sValidator } from "@hono/standard-validator";
import { toJsonSchema } from "@standard-community/standard-json";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Env, Input, MiddlewareHandler, ValidationTargets } from "hono";
import type { HasUndefined } from "./types.js";
import { uniqueSymbol } from "./utils.js";

/**
 * Create a validator middleware. Use this only for muppet tools.
 * @param target Target for validation
 * @param schema Standard Schema
 * @param hook Hook for validation
 * @returns Middleware handler
 */
export function mValidator<
  Schema extends StandardSchemaV1,
  Target extends keyof ValidationTargets,
  E extends Env,
  P extends string,
  In = StandardSchemaV1.InferInput<Schema>,
  Out = StandardSchemaV1.InferOutput<Schema>,
  I extends Input = {
    in: HasUndefined<In> extends true
      ? {
          [K in Target]?: In extends ValidationTargets[K]
            ? In
            : { [K2 in keyof In]?: ValidationTargets[K][K2] };
        }
      : {
          [K in Target]: In extends ValidationTargets[K]
            ? In
            : { [K2 in keyof In]: ValidationTargets[K][K2] };
        };
    out: { [K in Target]: Out };
  },
  V extends I = I,
>(
  target: Target,
  schema: Schema,
  hook?: Hook<StandardSchemaV1.InferOutput<Schema>, E, P, Target>,
): MiddlewareHandler<E, P, V> {
  const middleware = sValidator(target, schema, hook);

  // @ts-expect-error not typed well
  return Object.assign(middleware, {
    [uniqueSymbol]: {
      validationTarget: target,
      toJson: async () => ({
        schema: await toJsonSchema(schema),
      }),
    },
  });
}
