import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getToolbox } from "@/services/ai";
import { getCaps } from "@/services/ai/capabilities";
import { AiUserError } from "@/services/ai/types";
import { getEffect, resolveEffect } from "@/features/effects/catalog";
import { PRESETS, type PresetId } from "@/features/effects/html/presets";
import { DesignError, sanitizeDesign } from "@/features/effects/html/sanitize";
import { assertGuestAiAllowance, makeAiCtx } from "./ai";
import { findCachedDesign, normalizePrompt, saveCachedDesign } from "./design-cache";

export class DesignRequestError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type StoredDesign = { html: string; title: string; prompt: string; source: "ai" | "cache" | "template" };

export const designHash = (d?: StoredDesign | null) => (d ? createHash("sha1").update(d.html).digest("hex").slice(0, 12) : "none");

/**
 * Creates the animation design for a "Custom AI Animation" draft BEFORE the customer pays:
 *  - template: free, built-in HTML/CSS design (no AI call)
 *  - AI: Gemini/Groq writes it; it is sanitized and checked to really animate, so nothing broken is ever charged for.
 */
export async function createDesign(args: { generationId: string; guestSessionId: string; prompt: string; template?: string }) {
  const gen = await db.generation.findUnique({ where: { id: args.generationId } });
  if (!gen || gen.guestSessionId !== args.guestSessionId) throw new DesignRequestError("Not found", 404);
  if (gen.status !== "DRAFT") throw new DesignRequestError("This creation can no longer be changed.", 409);
  const effect = getEffect(gen.effect);
  if (!effect || effect.ai !== "design") throw new DesignRequestError("This effect does not use a description.");

  const raw = (gen.options ?? {}) as Record<string, unknown>;
  const prompt = args.prompt.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, effect.text?.maxLength ?? 200);
  const used = Number(raw.designs ?? 0);

  let design: StoredDesign;
  if (args.template) {
    const preset = PRESETS.find((p) => p.id === (args.template as PresetId));
    if (!preset) throw new DesignRequestError("Unknown template.");
    const title = prompt.split(/[.,!\n]/)[0].trim().slice(0, 28) || preset.label;
    const clean = await sanitizeDesign(preset.build(title));
    design = { html: clean.html, title: preset.label, prompt, source: "template" };
  } else {
    if (prompt.length < 3) throw new DesignRequestError("Please describe what you want, for example: “Eid Mubarak with glowing lanterns”.");
    if (used >= env.maxDesignsPerGeneration) {
      throw new DesignRequestError(`You have used all ${env.maxDesignsPerGeneration} AI designs for this photo. Pick your favourite, or try a free template.`, 429);
    }
    // Same idea asked before? Reuse the saved design: no AI call, no tokens, no allowance used.
    // Skipped when the customer asks for "another version" of the prompt they already have a design for.
    const previous = raw.design as StoredDesign | undefined;
    const wantsAnother = previous && normalizePrompt(previous.prompt) === normalizePrompt(prompt);
    const cached = wantsAnother ? null : await findCachedDesign(prompt);
    if (cached) {
      const clean = await sanitizeDesign(cached.html).catch(() => null); // re-checked: sanitizer rules may have tightened
      if (clean && clean.animations > 0) {
        design = { html: clean.html, title: cached.title, prompt, source: "cache" };
        await db.generation.update({ where: { id: gen.id }, data: { options: { ...raw, design } } });
        return { title: design.title, source: design.source, remaining: Math.max(0, env.maxDesignsPerGeneration - used) };
      }
    }
    const resolved = resolveEffect(effect, await getCaps());
    if (!resolved.available) throw new DesignRequestError(resolved.reason ?? "AI is unavailable right now.", 503);
    try {
      await assertGuestAiAllowance(args.guestSessionId, gen.id);
      const out = await getToolbox().designAnimation(prompt, makeAiCtx(gen.id));
      const clean = await sanitizeDesign(out.html);
      if (clean.animations === 0) throw new DesignError("The design did not move.");
      design = { html: clean.html, title: out.title.slice(0, 40), prompt, source: "ai" };
      const log = await db.aiUsageLog.findFirst({ where: { generationId: gen.id, step: "design", success: true }, orderBy: { createdAt: "desc" } });
      await saveCachedDesign({
        prompt, title: design.title, html: clean.html,
        provider: log?.provider ?? "ai", model: log?.model ?? "", costUsd: Number(log?.notionalCostUsd ?? 0),
      }).catch((err) => console.error("[design-cache] save failed", err)); // a cache failure must never fail the customer
    } catch (e) {
      // A bad AI answer still used a try (and free quota), so it is counted.
      await db.generation.update({ where: { id: gen.id }, data: { options: { ...raw, designs: used + 1 } } });
      if (e instanceof DesignError) throw new DesignRequestError("The AI's design was not usable this time. Please try again or tweak your description.", 502);
      if (e instanceof AiUserError) throw new DesignRequestError(e.message, e.status);
      throw e; // includes GuestAiLimitError (status 429), handled by the route
    }
  }

  const designs = design.source === "ai" ? used + 1 : used;
  await db.generation.update({ where: { id: gen.id }, data: { options: { ...raw, design, designs } } });
  return { title: design.title, source: design.source, remaining: Math.max(0, env.maxDesignsPerGeneration - designs) };
}
