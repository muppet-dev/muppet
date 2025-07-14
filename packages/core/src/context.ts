import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ClientRequest, Env, MCPError, ServerResult } from "./types";

/**
 * Interface for getting context variables.
 *
 * @template E - Environment type.
 */
type Get<E extends Env> = <Key extends keyof E["Variables"]>(
  key: Key,
) => E["Variables"][Key];

/**
 * Interface for setting context variables.
 *
 * @template E - Environment type.
 */
type Set<E extends Env> = <Key extends keyof E["Variables"]>(
  key: Key,
  value: E["Variables"][Key],
) => void;

export class Context<
  E extends Env,
  M extends ClientRequest = ClientRequest,
  R extends ServerResult = ServerResult,
> {
  #var: Map<unknown, unknown> | undefined;
  finalized = false;
  error: MCPError | undefined;
  #result: R | undefined;
  transport: Transport;

  constructor(public message: M, options: { env?: E; transport: Transport }) {
    if (options.env) {
      this.#var = new Map(Object.entries(options.env.Variables ?? {}));
    }

    this.transport = options.transport;
  }

  get result(): R | undefined {
    return this.#result;
  }

  set result(_result: R | undefined) {
    this.#result = _result;
    this.finalized = true;
  }

  set: Set<E> = (key, value) => {
    this.#var ??= new Map();
    this.#var.set(key, value);
  };

  get: Get<E> = (key) => {
    return (this.#var ? this.#var.get(key) : undefined) as E["Variables"][
      typeof key
    ];
  };

  get var(): Readonly<any> {
    if (!this.#var) {
      return {} as any;
    }
    return Object.fromEntries(this.#var);
  }
}
