import { db } from "@/lib/db";
import { getCaps } from "@/services/ai/capabilities";
import { formatPrice, getEffect, resolveEffect } from "@/features/effects/catalog";
import { GuestAiLimitError, assertGuestAiAllowance } from "./ai";
import type { StoredDesign } from "./design";
import { getBizTemplate } from "@/features/business/meta";
import { assertBizComplete } from "@/features/business/service";
import { parseName } from "@/features/personalized/service";

export class ReadinessError extends Error {
  constructor(message: string, public status = 409) {
    super(message);
  }
}

/**
 * Everything that must be true BEFORE we take or authorize any money: the effect can run right now,
 * the price the customer saw is still the price, a custom animation actually has a design,
 * and the guest still has free AI allowance. Otherwise the customer is told and not charged.
 */
export async function assertReadyToPay(gen: { id: string; guestSessionId: string; effect: string; priceUsd: unknown; options: unknown }) {
  const effect = getEffect(gen.effect);
  if (!effect) throw new ReadinessError("Unknown effect.", 400);
  const resolved = resolveEffect(effect, await getCaps());
  if (!resolved.available) throw new ReadinessError(`${resolved.reason ?? "This effect is unavailable right now."} You have not been charged.`, 503);

  if (Math.abs(Number(gen.priceUsd) - resolved.priceUsd) > 0.001) {
    await db.generation.update({ where: { id: gen.id }, data: { priceUsd: resolved.priceUsd } });
    throw new ReadinessError(`The price for this effect changed to ${formatPrice(resolved.priceUsd)}${resolved.note ? ` (${resolved.note})` : ""}. Please review it and confirm again. You have not been charged.`, 409);
  }

  if (effect.kind === "personal") {
    try {
      parseName((gen.options as { name?: unknown } | null)?.name);
    } catch {
      throw new ReadinessError("Please type a name first. You have not been charged.", 409);
    }
  }

  if (effect.kind === "business") {
    const t = getBizTemplate(effect.slug);
    const missing = t ? await assertBizComplete(t, gen.id, gen.options) : [];
    if (missing.length) throw new ReadinessError(`Please fill in: ${missing.join(", ")}. You have not been charged.`, 409);
  }

  if (effect.kind === "html" && !((gen.options ?? {}) as { design?: StoredDesign }).design?.html) {
    throw new ReadinessError("Create your animation design first, then generate. You have not been charged.", 409);
  }

  if (effect.ai !== "none") {
    try {
      await assertGuestAiAllowance(gen.guestSessionId, gen.id);
    } catch (e) {
      if (e instanceof GuestAiLimitError) throw new ReadinessError(`${e.message} You have not been charged.`, 429);
      throw e;
    }
  }
}
