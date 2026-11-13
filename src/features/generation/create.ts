import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorage } from "@/services/storage";
import { getCaps } from "@/services/ai/capabilities";
import { normalizeOptions, resolveEffect, type EffectDef } from "@/features/effects/catalog";

export class CreateError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Per-guest daily cap on new drafts (cheap abuse guard; the global AI budget is the real backstop). */
export async function assertUnderDailyLimit(guestSessionId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await db.generation.count({ where: { guestSessionId, createdAt: { gte: since } } });
  if (count >= env.maxGenerationsPerGuestPerDay) throw new CreateError("Daily limit reached. Try again tomorrow.", 429);
}

/** Creates a DRAFT generation and stores its private copy of the (already normalized) PNG. */
export async function createDraft(opts: {
  guestSessionId: string;
  effect: EffectDef;
  rawOptions: unknown;
  png: Buffer;
  width?: number;
  height?: number;
}) {
  const resolved = resolveEffect(opts.effect, await getCaps());
  if (!resolved.available) throw new CreateError(resolved.reason ?? "This effect is unavailable right now.", 503);
  const options = normalizeOptions(opts.effect, opts.rawOptions);
  const generation = await db.generation.create({
    data: {
      guestSessionId: opts.guestSessionId,
      effect: opts.effect.slug,
      options,
      priceUsd: resolved.priceUsd,
      originalKey: "pending",
      expiresAt: new Date(Date.now() + env.retentionHours * 60 * 60 * 1000),
    },
  });
  const key = `uploads/${opts.guestSessionId}/${generation.id}.png`;
  await getStorage().put(key, opts.png);
  await db.generation.update({ where: { id: generation.id }, data: { originalKey: key } });
  await db.generatedAsset.create({
    data: { generationId: generation.id, kind: "original", storageKey: key, bytes: opts.png.length, width: opts.width, height: opts.height },
  });
  return { id: generation.id, effect: opts.effect.slug, price: resolved.priceUsd, options, note: resolved.note ?? null };
}
