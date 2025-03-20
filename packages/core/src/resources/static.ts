import { McpPrimitives, uniqueSymbol } from "@/utils";
import type { MiddlewareHandler } from "hono";
import { getRuntimeKey } from "hono/adapter";
import type { serveStatic } from "hono/bun";

export type StaticResourceOptions = {
  name?: string;
  description?: string;
  resource: {
    root?: string;
    path?: string;
    rewriteRequestPath?: (path: string) => string;
  };
};

export function staticResource(options: StaticResourceOptions) {
  let serveHandler: typeof serveStatic | undefined;

  const middleware: MiddlewareHandler = async (c, next) => {
    if (!serveHandler) {
      const runtime = getRuntimeKey();

      switch (runtime) {
        case "bun":
          serveHandler = await import("hono/bun").then(
            (mod) => mod.serveStatic,
          );
          break;
        case "deno":
          serveHandler = await import("hono/deno").then(
            (mod) => mod.serveStatic,
          );
          break;
        case "node":
          // @ts-expect-error
          serveHandler = await import("@hono/node-server/serve-static").then(
            (mod) => mod.serveStatic,
          );
          break;
      }
    }

    if (!serveHandler) {
      throw new Error("No static resource server available for this runtime.");
    }

    return serveHandler({
      root: options.resource.root,
      path: options.resource.path,
      rewriteRequestPath: options.resource.rewriteRequestPath,
    })(c, next);
  };

  return Object.assign(middleware, {
    [uniqueSymbol]: {
      resolver: () => options,
      type: McpPrimitives.RESOURCES,
    },
  });
}
