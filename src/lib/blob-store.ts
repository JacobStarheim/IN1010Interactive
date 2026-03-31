import "server-only";

import { get, put } from "@vercel/blob";

const requireBlobToken = () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }
};

export const isBlobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  requireBlobToken();
  const result = await get(pathname, { access: "private" });
  if (!result || !result.stream) {
    return null;
  }

  const raw = await new Response(result.stream).text();
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as T;
}

export async function writePrivateJson(pathname: string, value: unknown) {
  requireBlobToken();
  await put(pathname, JSON.stringify(value, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
