import { fileTypeFromBuffer } from "file-type";

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

export async function imageContent(options: ContentOptions) {
  let rawData: Buffer;

  if ("url" in options) {
    rawData = await loadFromUrl(options.url);
  } else if ("buffer" in options) {
    rawData = options.buffer;
  } else if ("path" in options) {
    rawData = await loadFromPath(options.path);
  } else {
    throw new Error("Invalid content options");
  }

  const mimeType = await fileTypeFromBuffer(rawData);

  const base64Data = rawData.toString("base64");

  return {
    type: "image",
    data: base64Data,
    mimeType: mimeType?.mime ?? "image/png",
  } as const;
}

export async function audioContent(options: ContentOptions) {
  let rawData: Buffer;

  if ("url" in options) {
    rawData = await loadFromUrl(options.url);
  } else if ("buffer" in options) {
    rawData = options.buffer;
  } else if ("path" in options) {
    rawData = await loadFromPath(options.path);
  } else {
    throw new Error("Invalid content options");
  }

  const mimeType = await fileTypeFromBuffer(rawData);

  const base64Data = rawData.toString("base64");

  return {
    type: "audio",
    data: base64Data,
    mimeType: mimeType?.mime ?? "audio/mpeg",
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
