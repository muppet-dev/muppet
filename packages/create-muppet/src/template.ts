import type { Option } from "@clack/prompts";
import { downloadTemplate } from "giget";

export const TRANSPORT_LAYERS = {
  STREAMING: {
    label: "The HTTP Streaming Transport from muppet",
    value: "streaming",
    hint: "recommended",
  },
  STDIO: {
    label: "The Stdio Transport from @modelcontextprotocol/sdk",
    value: "stdio",
  },
  CLASSIC_SSE: {
    label: "The SSE Transport from @modelcontextprotocol/sdk",
    value: "classic-sse",
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
  [TRANSPORT_LAYERS.CLASSIC_SSE.value]: [
    { label: "express.js x hono x nodejs", value: "nodejs" },
  ],
  [TRANSPORT_LAYERS.STREAMING.value]: ["bun"],
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
  "nodejs:classic-sse": "with-sse-express",
  // Hono Streaming Templates
  "bun:streaming": "muppet-hono",
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
