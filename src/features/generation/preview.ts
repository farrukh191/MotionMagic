import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { createLimiter } from "@/lib/limiter";
import { getStorage } from "@/services/storage";
import { getToolbox } from "@/services/ai";
import { getCaps } from "@/services/ai/capabilities";
import { AiUserError } from "@/services/ai/types";
import { getEffect, levelToNumber, normalizeOptions, resolveEffect } from "@/features/effects/catalog";
import { DesignError, sanitizeDesign } from "@/features/effects/html/sanitize";
import { renderDesignGif } from "@/features/effects/html/render-html";
import { PREVIEW_SPEC, hasRenderer, renderEffect } from "@/features/effects/render";
import { assertGuestAiAllowance, GuestAiLimitError, makeAiCtx, makeExtrasStore } from "./ai";
import { designHash, type StoredDesign } from "./design";
import { NeedsAiError, gatherExtras } from "./extras";
import { getBizTemplate, normalizeBizOptions } from "@/features/business/meta";
import { renderBusinessGif } from "@/features/business/render";
import { loadBizInputs } from "@/features/business/service";

const MAX_PREVIEW_RENDERS_PER_GENERATION = 20;
const limit = createLimiter(2);

export class PreviewError extends Error {
  constructor(message: string, public status = 400, public needsAi = false) {
    super(message);
  }
}

/**
 * Free, low-resolution, watermarked preview.
 * Built-in effects render instantly. Effects that need AI (edit / eye finding) only call the AI when the customer
 * explicitly asks (runAi), because it uses limited free quota; the AI result is remembered and reused after payment.
 */
export async function getPreviewGif(generationId: string, guestSessionId: string, runAi = false): Promise<Buffer> {
  const gen = await db.generation.findUnique({ where: { id: generationId } });
  if (!gen || gen.guestSessionId !== guestSessionId) throw new PreviewError("Not found", 404);
  if (gen.status === "EXPIRED" || gen.originalKey === "deleted") throw new PreviewError("File no longer available.", 410);

  const effect = getEffect(gen.effect);
  if (!effect || effect.kind === "motion" || effect.kind === "personal") throw new PreviewError("No free preview for this effect.", 404);
  if (effect.kind === "built-in" && !hasRenderer(effect.slug)) throw new PreviewError("No free preview for this effect.", 404);

  const resolved = resolveEffect(effect, await getCaps());
  if (!resolved.available) throw new PreviewError(resolved.reason ?? "This effect is unavailable right now.", 503);

  const raw = (gen.options ?? {}) as Record<string, unknown>;
  if (effect.kind === "business") return getBusinessPreview(gen, raw);
  const opts = normalizeOptions(effect, raw);
  const design = raw.design as StoredDesign | undefined;
  if (effect.kind === "html" && !design?.html) throw new PreviewError("Describe your animation first, then press “Design my animation”.", 409);

  const hash = createHash("sha1")
    .update(JSON.stringify([effect.slug, opts, designHash(design), raw.eyes ?? null, resolved.useAiEdit, resolved.basic]))
    .digest("hex")
    .slice(0, 16);
  const key = `previews/${gen.id}/${hash}.gif`;
  const storage = getStorage();
  try {
    return await storage.get(key);
  } catch {
    /* not cached yet */
  }

  const used = Number(raw.previewRenders ?? 0);
  if (used >= MAX_PREVIEW_RENDERS_PER_GENERATION) {
    throw new PreviewError("Preview limit reached for this photo. Pick your favourite and generate it!", 429);
  }

  const image = await storage.get(gen.originalKey);
  const spec = { ...PREVIEW_SPEC, seconds: effect.durationSeconds };
  let gif: Buffer;
  try {
    if (effect.kind === "html") {
      const clean = await sanitizeDesign(design!.html);
      gif = (await renderDesignGif(clean.html, image, spec)).gif;
    } else {
      const needsAiNow = runAi && ((effect.ai === "edit" && resolved.useAiEdit) || effect.ai === "eyes");
      if (needsAiNow) await assertGuestAiAllowance(guestSessionId, gen.id);
      const { image: source, extras } = await gatherExtras({
        effect, resolved, original: image, store: makeExtrasStore(gen.id), toolbox: getToolbox(), ctx: makeAiCtx(gen.id), allowAi: runAi,
      });
      // The AI result may have just been saved; fall through and render it.
      gif = (
        await limit(() =>
          renderEffect(effect.slug, source, { text: opts.text, theme: opts.theme, level: levelToNumber(opts.intensity), nudge: opts.nudge }, spec, extras),
        )
      ).gif;
    }
  } catch (e) {
    if (e instanceof NeedsAiError) throw new PreviewError("This effect needs a short AI step first.", 202, true);
    if (e instanceof GuestAiLimitError) throw new PreviewError(e.message, 429);
    if (e instanceof AiUserError) throw new PreviewError(e.message, e.status);
    if (e instanceof DesignError) throw new PreviewError("The design could not be previewed. Try designing it again.", 422);
    throw e;
  }

  // Re-read so AI results saved during this render (eye positions) are not overwritten.
  const fresh = await db.generation.findUnique({ where: { id: gen.id }, select: { options: true } });
  await db.generation.update({ where: { id: gen.id }, data: { options: { ...((fresh?.options ?? raw) as object), previewRenders: used + 1 } } });
  await storage.put(key, gif);
  return gif;
}

/** Business previews: free, watermarked, no AI. Cached per option set so edits re-render and repeats are instant. */
async function getBusinessPreview(gen: { id: string; effect: string }, raw: Record<string, unknown>): Promise<Buffer> {
  const t = getBizTemplate(gen.effect);
  if (!t) throw new PreviewError("Unknown template.", 404);
  const opts = normalizeBizOptions(t, raw);
  const hash = createHash("sha1").update(JSON.stringify([t.slug, opts])).digest("hex").slice(0, 16);
  const key = `previews/${gen.id}/${hash}.gif`;
  const storage = getStorage();
  try {
    return await storage.get(key);
  } catch {
    /* not cached yet */
  }
  const used = Number(raw.previewRenders ?? 0);
  if (used >= MAX_PREVIEW_RENDERS_PER_GENERATION * 2) throw new PreviewError("Preview limit reached. Pick your favourite and generate it!", 429);
  const { inputs } = await loadBizInputs(gen.id);
  let gif: Buffer;
  try {
    gif = (await renderBusinessGif(t, opts, inputs, { ...PREVIEW_SPEC, seconds: t.seconds })).gif;
  } catch (e) {
    if (e instanceof DesignError) throw new PreviewError("The preview could not be created. Please try again.", 422);
    throw e;
  }
  const fresh = await db.generation.findUnique({ where: { id: gen.id }, select: { options: true } });
  await db.generation.update({ where: { id: gen.id }, data: { options: { ...((fresh?.options ?? raw) as object), previewRenders: used + 1 } } });
  await storage.put(key, gif);
  return gif;
}
