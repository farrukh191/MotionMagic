import { createHash } from "node:crypto";

/** "  Eid MUBARAK, with lanterns!! " and "eid mubarak with lanterns" are the same request. */
export function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const promptKey = (prompt: string) => createHash("sha1").update(normalizePrompt(prompt)).digest("hex");

