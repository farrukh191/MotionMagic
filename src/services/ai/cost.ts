import { env } from "@/lib/env";
import type { AiStep, Usage } from "./types";

/** Builds the usage record for one call: notional (paid-plan) cost, and actual cost (0 on free tier). */
export function makeUsage(
  provider: "gemini" | "groq",
  model: string,
  step: AiStep,
  inputTokens = 0,
  outputTokens = 0,
  images = 0,
): Usage {
  const p = env.price;
  let notional = 0;
  if (provider === "gemini") {
    notional =
      step === "image-edit"
        ? images * p.geminiImagePerImage
        : (inputTokens * p.geminiTextInPerM + outputTokens * p.geminiTextOutPerM) / 1e6;
  } else {
    const [i, o] = step === "eyes" ? [p.groqVisionInPerM, p.groqVisionOutPerM] : [p.groqTextInPerM, p.groqTextOutPerM];
    notional = (inputTokens * i + outputTokens * o) / 1e6;
  }
  const free = provider === "gemini" ? env.geminiFreeTier : env.groqFreeTier;
  return { provider, model, step, inputTokens, outputTokens, images, notionalCostUsd: notional, costUsd: free ? 0 : notional };
}
