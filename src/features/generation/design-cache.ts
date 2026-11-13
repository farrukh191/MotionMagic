import { db } from "@/lib/db";

/**
 * Design cache: the AI is only asked once for a given description.
 * The next customer who types (or taps) the same idea gets the saved, already-sanitized design instantly,
 * with no AI call, no token cost and no free-quota use.
 */

import { normalizePrompt, promptKey } from "./prompt-key";
export { normalizePrompt, promptKey };

export async function findCachedDesign(prompt: string): Promise<{ html: string; title: string } | null> {
  if (normalizePrompt(prompt).length < 3) return null;
  const row = await db.designCache.findUnique({ where: { promptKey: promptKey(prompt) } });
  if (!row) return null;
  await db.designCache.update({ where: { id: row.id }, data: { hits: { increment: 1 }, lastUsedAt: new Date() } });
  return { html: row.html, title: row.title };
}

/** Stores a design that has already passed sanitizing and the "it really moves" check. */
export async function saveCachedDesign(args: { prompt: string; title: string; html: string; provider: string; model: string; costUsd: number }) {
  const key = promptKey(args.prompt);
  await db.designCache.upsert({
    where: { promptKey: key },
    create: { promptKey: key, prompt: args.prompt.slice(0, 300), title: args.title, html: args.html, provider: args.provider, model: args.model, costUsd: args.costUsd },
    update: { title: args.title, html: args.html, provider: args.provider, model: args.model, lastUsedAt: new Date() },
  });
}

/** Housekeeping: drop designs nobody has reused for 90 days (called by the cleanup worker). */
export async function pruneDesignCache(days = 90): Promise<number> {
  const res = await db.designCache.deleteMany({ where: { lastUsedAt: { lt: new Date(Date.now() - days * 86_400_000) }, hits: { lt: 3 } } });
  return res.count;
}
