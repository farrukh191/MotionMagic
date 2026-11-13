import { env } from "@/lib/env";
import { sign, verifySignature } from "@/lib/signing";

/** Create a short-lived signed token that grants download of one generation. */
export function createDownloadToken(generationId: string, ttlSeconds = 15 * 60): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${generationId}.${expires}`;
  return `${payload}.${sign(payload, env.downloadSecret)}`;
}

export function verifyDownloadToken(token: string): { generationId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [generationId, expires, signature] = parts;
  if (!verifySignature(`${generationId}.${expires}`, signature, env.downloadSecret)) return null;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return null;
  return { generationId };
}
