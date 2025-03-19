import { type Hook, sValidator } from "@hono/standard-validator";
import { toJsonSchema } from "@standard-community/standard-json";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Env, Input, MiddlewareHandler, ValidationTargets } from "hono";
import type { HasUndefined } from "../types.js";
import { uniqueSymbol } from "../utils.js";

/**
 * Generate a resolver for a Standard Schema
 * @param schema Standard Schema
 * @returns Resolver result
 */
function resolver<T extends StandardSchemaV1>(schema: T) {
  return {
    builder: (options?: Record<string, unknown>) =>
      toJsonSchema(schema, options),
    validator: (value: unknown) => {
      schema["~standard"].validate(value);
    },
  };
}

/**
 * Create a validator middleware
 * @param target Target for validation
 * @param schema Standard Schema
 * @param hook Hook for validation
 * @returns Middleware handler
 */
export function validator<
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
      resolver: async (options?: Record<string, unknown>) => {
        if (target === "json") {
          return { inputSchema: await resolver(schema).builder(options) };
        }

        return null;
      },
    },
  });
}
