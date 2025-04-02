import { downloadTemplate } from "giget";

export const TRANSPORT_LAYERS = {
  STDIO: "stdio",
  CLASSIC_SSE: "sse",
  HONO_SSE: "hono-sse",
};

export const ALL_TRANSPORT_LAYERS = Object.values(TRANSPORT_LAYERS);

export const RUNTIMES_BY_TRANSPORT_LAYER = {
  [TRANSPORT_LAYERS.STDIO]: ["bun", "deno", "nodejs"],
  [TRANSPORT_LAYERS.CLASSIC_SSE]: ["bun", "nodejs"],
  [TRANSPORT_LAYERS.HONO_SSE]: ["bun", "cloudflare-workers", "deno", "nodejs"],
};

export const ALL_UNIQUE_TEMPLATES = Array.from(
  new Set(Object.values(RUNTIMES_BY_TRANSPORT_LAYER).flat()),
);

const TEMPLATE_NAME_MAP: Record<string, string | undefined> = {
  // Stdio Templates
  "bun:stdio": "with-stdio",
  "deno:stdio": "deno-stdio",
  "nodejs:stdio": "with-stdio",
  // Classic SSE Templates
  "bun:sse": "with-sse",
  "nodejs:sse": "with-sse",
  // Hono SSE Templates
  "bun:hono-sse": "hono-with-sse",
  "deno:hono-sse": "hono-with-sse",
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

  if (!template)
    throw new Error(`No template found for ${runtime}:${transport}`);

  return downloadTemplate(`gh:muppet-dev/muppet/examples/${template}`, {
    dir,
    offline,
    force: true,
  });
}
