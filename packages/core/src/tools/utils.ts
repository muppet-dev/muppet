import { fileTypeFromBuffer } from "file-type";
import type { AudioContent, ImageContent } from "./types";

export type ContentOptions =
  | {
    url: string;
  }
  | {
    buffer: Buffer;
  }
  | {
    path: string;
  };

export async function imageContent(
  content: ContentOptions,
  options?: { _meta?: Record<string, unknown> },
): Promise<ImageContent> {
  let rawData: Buffer;

  if ("url" in content) {
    rawData = await loadFromUrl(content.url);
  } else if ("buffer" in content) {
    rawData = content.buffer;
  } else if ("path" in content) {
    rawData = await loadFromPath(content.path);
  } else {
    throw new Error("Invalid content options");
  }

  const mimeType = await fileTypeFromBuffer(rawData);

  const base64Data = rawData.toString("base64");

  return {
    type: "image",
    data: base64Data,
    mimeType: mimeType?.mime ?? "image/png",
    _meta: options?._meta,
  } as const;
}

export async function audioContent(
  content: ContentOptions,
  options?: { _meta?: Record<string, unknown> },
): Promise<AudioContent> {
  let rawData: Buffer;

  if ("url" in content) {
    rawData = await loadFromUrl(content.url);
  } else if ("buffer" in content) {
    rawData = content.buffer;
  } else if ("path" in content) {
    rawData = await loadFromPath(content.path);
  } else {
    throw new Error("Invalid content options");
  }

  const mimeType = await fileTypeFromBuffer(rawData);

  const base64Data = rawData.toString("base64");

  return {
    type: "audio",
    data: base64Data,
    mimeType: mimeType?.mime ?? "audio/mpeg",
    _meta: options?._meta,
  } as const;
}

async function loadFromUrl(url: string) {
  return fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      }

      return Buffer.from(await response.arrayBuffer());
    })
    .catch((error) => {
      console.error(`Error loading URL: ${error.message}`);
      throw error;
    });
}

async function loadFromPath(path: string) {
  try {
    const { readFile } = await import("node:fs/promises");

    return readFile(path);
  } catch (error) {
    throw new Error("muppet: Unable to import 'fs' module.");
  }
}

export const ErrorCode = {
  // Standard JSON-RPC error codes
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
};
