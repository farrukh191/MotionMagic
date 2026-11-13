import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorage } from "@/services/storage";
import { assertAiAllowed, getMotionProvider, getToolbox } from "@/services/ai";
import { getCaps } from "@/services/ai/capabilities";
import { AiUserError, type Usage } from "@/services/ai/types";
import { videoToGif } from "@/services/gif/video-to-gif";
import { getEffect, levelToNumber, normalizeOptions, resolveEffect } from "@/features/effects/catalog";
import { DesignError, sanitizeDesign } from "@/features/effects/html/sanitize";
import { renderDesignGif } from "@/features/effects/html/render-html";
import { FINAL_SPEC, renderEffect } from "@/features/effects/render";
import { capturePayment, refundPayment } from "@/features/payments/service";
import { generationAiTotals, makeAiCtx, makeExtrasStore } from "./ai";
import { gatherExtras } from "./extras";
import type { StoredDesign } from "./design";
import { getBizTemplate } from "@/features/business/meta";
import { renderBusinessGif } from "@/features/business/render";
import { loadBizInputs } from "@/features/business/service";

const EXPECTED_MOTION_COST_USD = 0.3;
const SAFE_FAILURE_MESSAGE = "Generation failed. You have not been charged. Please try again.";

/** Atomically claims the oldest queued job so two workers never process the same one. */
export async function claimNextJob(): Promise<string | null> {
  const next = await db.generation.findFirst({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!next) return null;
  const claimed = await db.generation.updateMany({
    where: { id: next.id, status: "QUEUED" },
    data: { status: "PROCESSING", attempts: { increment: 1 }, processingStartedAt: new Date() },
  });
  return claimed.count === 1 ? next.id : null;
}

/** Customer-safe message for a failure: our own AI/design errors are readable, anything else is generic. */
function safeMessage(e: unknown): string {
  if (e instanceof AiUserError) return /not been charged/i.test(e.message) ? e.message : `${e.message} You have not been charged.`;
  if (e instanceof DesignError) return "The animation design could not be rendered. You have not been charged. Please try again.";
  return SAFE_FAILURE_MESSAGE;
}

/** Runs one claimed generation end to end, records the real AI cost, then captures payment (or refunds on failure). */
export async function processGeneration(id: string): Promise<void> {
  const gen = await db.generation.findUniqueOrThrow({ where: { id } });
  try {
    const effect = getEffect(gen.effect);
    if (!effect) throw new Error(`Unknown effect ${gen.effect}`);
    const options = normalizeOptions(effect, gen.options);
    const resolved = resolveEffect(effect, await getCaps());
    if (!resolved.available) throw new AiUserError(resolved.reason ?? "This effect is unavailable right now.", 503);

    const storage = getStorage();
    const original = await storage.get(gen.originalKey);
    const ctx = makeAiCtx(id);
    let gif: Buffer;
    let width: number;

    if (effect.kind === "motion") {
      // Realistic AI image-to-video (beta). Needs a fal.ai key.
      await assertAiAllowed(EXPECTED_MOTION_COST_USD);
      const started = Date.now();
      const provider = getMotionProvider();
      const usage = (cost: number, model: string): Usage => ({
        provider: env.aiMode === "live" ? "fal.ai" : "mock", model, step: "image-to-motion",
        inputTokens: 0, outputTokens: 0, images: 0, costUsd: cost, notionalCostUsd: cost,
      });
      let result;
      try {
        result = await provider.imageToMotion(original, options.text, effect.durationSeconds);
      } catch (e) {
        await ctx.log(usage(0, env.falMotionModel), false); // failed calls may still be billed: reconcile with fal's dashboard
        throw e;
      }
      await ctx.log(usage(result.costUsd, result.model), true);
      ({ gif, width } = await videoToGif(result.video, { maxSeconds: effect.durationSeconds }));
    } else if (effect.kind === "business") {
      // Business Animation Studio: our own template + the customer's text and images. No AI call, no AI cost.
      const t = getBizTemplate(effect.slug);
      if (!t) throw new Error(`Unknown business template ${effect.slug}`);
      const { inputs } = await loadBizInputs(id);
      const r = await renderBusinessGif(t, gen.options, inputs, { ...FINAL_SPEC, seconds: t.seconds });
      gif = r.gif;
      width = r.width;
    } else if (effect.kind === "html") {
      // Custom AI animation: the AI design was created (and paid for in free quota) before checkout.
      const stored = ((gen.options ?? {}) as { design?: StoredDesign }).design;
      if (!stored?.html) throw new DesignError("No design was created.");
      const clean = await sanitizeDesign(stored.html); // defence in depth: re-checked right before rendering
      const r = await renderDesignGif(clean.html, original, { ...FINAL_SPEC, seconds: effect.durationSeconds });
      gif = r.gif;
      width = r.width;
    } else {
      const { image, extras } = await gatherExtras({
        effect, resolved, original, store: makeExtrasStore(id), toolbox: getToolbox(), ctx, allowAi: true,
      });
      const r = await renderEffect(
        effect.slug,
        image,
        { text: options.text, theme: options.theme, level: levelToNumber(options.intensity), nudge: options.nudge },
        { ...FINAL_SPEC, seconds: effect.durationSeconds },
        extras,
      );
      gif = r.gif;
      width = r.width;
    }

    const outputKey = `outputs/${gen.guestSessionId}/${id}.gif`;
    await storage.put(outputKey, gif);
    await db.generatedAsset.create({ data: { generationId: id, kind: "gif", storageKey: outputKey, bytes: gif.length, width } });

    // Actual cost = every AI call for this creation (design, eyes, edit, video), including failed attempts and previews.
    const totals = await generationAiTotals(id);
    const used = await db.aiUsageLog.findMany({ where: { generationId: id }, distinct: ["provider"], select: { provider: true, model: true } });
    await db.generation.update({
      where: { id },
      data: {
        status: "COMPLETED",
        outputKey,
        completedAt: new Date(),
        aiProvider: used.length ? used.map((u) => u.provider).join(",").slice(0, 100) : "none",
        aiModel: used.length ? used.map((u) => u.model).join(",").slice(0, 190) : resolved.basic ? "basic-mode" : "built-in",
        aiCostUsd: totals.costUsd,
        aiNotionalCostUsd: totals.notionalCostUsd,
        errorMessage: null,
      },
    });

    try {
      await capturePayment(id);
    } catch (e) {
      console.error(`[worker] capture failed for ${id}`, e); // GIF delivered; reconcile, do not hide
    }
  } catch (e) {
    console.error(`[worker] generation ${id} failed`, e instanceof Error ? e.message : e);
    const totals = await generationAiTotals(id).catch(() => ({ costUsd: 0, notionalCostUsd: 0 }));
    await db.generation.update({
      where: { id },
      data: { status: "FAILED", errorMessage: safeMessage(e), aiCostUsd: totals.costUsd, aiNotionalCostUsd: totals.notionalCostUsd },
    });
    try {
      await refundPayment(id);
    } catch (refundError) {
      console.error(`[worker] REFUND FAILED for ${id} - manual action required`, refundError);
    }
  }
}
