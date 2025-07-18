import type { Option } from "@clack/prompts";
import { downloadTemplate } from "giget";

export const TRANSPORT_LAYERS = {
  STREAMING: {
    label: "The HTTP Streaming Transport from @hono/mcp",
    value: "streaming",
    hint: "recommended",
  },
  STDIO: {
    label: "The Stdio Transport from @modelcontextprotocol/sdk",
    value: "stdio",
  },
  SSE: {
    label: "The SSE Transport from @modelcontextprotocol/sdk",
    value: "sse",
  },
};

export const ALL_TRANSPORT_LAYERS = Object.values(TRANSPORT_LAYERS).map(
  (t) => t.value,
);

export const RUNTIMES_BY_TRANSPORT_LAYER: Record<
  string,
  (string | Option<string>)[]
> = {
  [TRANSPORT_LAYERS.STDIO.value]: ["bun", "nodejs", "deno"],
  [TRANSPORT_LAYERS.SSE.value]: [
    { label: "express.js x hono x nodejs", value: "nodejs" },
  ],
  [TRANSPORT_LAYERS.STREAMING.value]: ["bun", "cloudflare-workers"],
};

export const ALL_UNIQUE_TEMPLATES = Array.from(
  new Set(
    Object.values(RUNTIMES_BY_TRANSPORT_LAYER).reduce<string[]>((prev, cur) => {
      const items = cur.map((item) => {
        if (typeof item === "string") return item;
        return item.value;
      });

      prev.push(...items);
      return prev;
    }, []),
  ),
);

const TEMPLATE_NAME_MAP: Record<string, string | undefined> = {
  // Stdio Templates
  "bun:stdio": "with-stdio",
  "deno:stdio": "deno-stdio",
  "nodejs:stdio": "with-stdio",
  // Classic SSE Templates
  "nodejs:sse": "with-sse-express",
  // Hono Streaming Templates
  "bun:streaming": "with-streaming",
  "cloudflare-workers:streaming": "with-streaming",
};

type DownloadOptions = {
  dir: string;
  runtime: string;
  transport: string;
  offline?: boolean;
};

export function download(options: DownloadOptions) {
  const { dir, runtime, transport, offline } = options;

  const template = TEMPLATE_NAME_MAP[`${runtime}:${transport}`];

  if (!template) {
    throw new Error(`No template found for ${runtime}:${transport}`);
  }

  return downloadTemplate(`gh:muppet-dev/muppet/examples/${template}`, {
    dir,
    offline,
    force: true,
  });
}
