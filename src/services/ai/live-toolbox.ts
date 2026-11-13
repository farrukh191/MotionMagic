import { env } from "@/lib/env";
import { geminiDesign, geminiEdit, geminiEyes } from "./gemini";
import { groqDesign, groqEyes } from "./groq";
import { AiHttpError } from "./http";
import { providerConfigured, providerHasCapacity, type Provider } from "./quota";
import { AiUserError, type AiToolbox, type Eyes } from "./types";

const RESTING = "Our AI helper is resting for today because of free-usage limits. Please try again tomorrow, or choose a built-in effect.";
const FAILED = "The AI could not finish this right now. You have not been charged. Please try again in a moment.";

/** Providers that are configured, have quota left, ordered by AI_TEXT_ORDER. A lone provider gets one retry. */
async function textCandidates(): Promise<Provider[]> {
  const ok: Provider[] = [];
  for (const p of env.aiTextOrder) {
    if ((p === "gemini" || p === "groq") && (await providerHasCapacity(p, "text"))) ok.push(p);
  }
  if (ok.length === 1 && env.aiMaxRetries > 0) ok.push(ok[0]);
  return ok;
}

/** Validates model-reported eye positions. Vision models can be wrong, so everything is range-checked. */
export function parseEyes(j: Record<string, unknown>): Eyes {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
  const pt = (o: unknown) => {
    const r = (o ?? {}) as Record<string, unknown>;
    return { x: num(r.x), y: num(r.y) };
  };
  if (j.faceFound === false) throw new AiUserError("We could not find a face with two visible eyes. Try a front-facing, well-lit photo.", 422);
  const a = pt(j.leftEye);
  const b = pt(j.rightEye);
  const [left, right] = a.x <= b.x ? [a, b] : [b, a];
  const inRange = [left.x, left.y, right.x, right.y].every((v) => v >= 0.02 && v <= 0.98);
  const dx = right.x - left.x;
  const dy = Math.abs(right.y - left.y);
  if (!inRange || !(dx >= 0.05) || dy > dx * 0.8) {
    throw new AiUserError("We could not find two clear eyes in this photo. Try a front-facing, well-lit photo.", 422);
  }
  const w = num(j.eyeWidth);
  const width = Number.isFinite(w) && w >= 0.02 && w <= dx ? w : dx * 0.45;
  return { left, right, width };
}

export const liveToolbox: AiToolbox = {
  async designAnimation(prompt, ctx) {
    const candidates = await textCandidates();
    if (!candidates.length) throw new AiUserError(RESTING, 503);
    for (const p of candidates) {
      try {
        return p === "groq" ? await groqDesign(prompt, ctx) : await geminiDesign(prompt, ctx);
      } catch (e) {
        console.error(`[ai] design via ${p} failed:`, e instanceof Error ? e.message : e);
      }
    }
    throw new AiUserError(FAILED, 502);
  },

  async detectEyes(image, ctx) {
    const candidates = await textCandidates();
    if (!candidates.length) throw new AiUserError(RESTING, 503);
    let userError: AiUserError | null = null;
    for (const p of candidates) {
      try {
        return parseEyes(p === "groq" ? await groqEyes(image, ctx) : await geminiEyes(image, ctx));
      } catch (e) {
        if (e instanceof AiUserError) userError = e; // second opinion from the next provider
        else console.error(`[ai] eyes via ${p} failed:`, e instanceof Error ? e.message : e);
      }
    }
    throw userError ?? new AiUserError(FAILED, 502);
  },

  async editImage(image, kind, ctx) {
    if (!env.geminiImageEnabled) throw new AiUserError("AI image editing is not enabled on this server.", 503);
    if (!providerConfigured("gemini") || !(await providerHasCapacity("gemini", "image"))) throw new AiUserError(RESTING, 503);
    for (let attempt = 0; attempt <= env.aiMaxRetries; attempt++) {
      try {
        return { image: await geminiEdit(image, kind, ctx) };
      } catch (e) {
        console.error("[ai] image edit failed:", e instanceof Error ? e.message : e);
        const retryable = e instanceof AiHttpError && e.status >= 500;
        if (e instanceof AiHttpError && e.status === 429) throw new AiUserError(RESTING, 503);
        if (!retryable || !(await providerHasCapacity("gemini", "image"))) break;
      }
    }
    throw new AiUserError("The AI could not edit this photo (some photos are not allowed by the AI provider). You have not been charged.", 502);
  },
};
