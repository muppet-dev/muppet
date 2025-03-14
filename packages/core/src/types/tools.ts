import type { StandardSchemaV1 } from "@standard-schema/spec";

export type ToolConfig<
  T extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
> = {
  description?: string;
  schema?: T;
  handler: T extends StandardSchemaV1
    ? (args: StandardSchemaV1.InferOutput<T>) => Promise<unknown>
    : () => Promise<unknown>;
};
