import { mockCartoonize } from "@/services/ai/mock-toolbox";
import type { EffectDef } from "@/features/effects/catalog";
import type { RenderExtras } from "@/features/effects/render";
import { sampleImage } from "./sample-image";

/** Known eye centres in the sample illustration (fractions of the image). */
export const SAMPLE_EYES = { left: { x: 0.413, y: 0.498 }, right: { x: 0.587, y: 0.498 }, width: 0.09 };

/**
 * Builds the inputs a renderer needs, for gallery samples only: illustrated stand-ins for the AI results
 * (the real AI output depends on the customer's photo and on which AI models are enabled).
 */
export async function samplePrep(e: EffectDef, size = 900): Promise<{ image: Buffer; extras: RenderExtras }> {
  const base = await sampleImage(size, "base");
  if (e.ai === "edit" && e.editKind === "cartoon") return { image: await mockCartoonize(base), extras: {} };
  if (e.ai === "edit" && e.editKind) {
    const variant = ({ smile: "smile", superhero: "hero", dreamy: "dreamy" } as const)[e.editKind as "smile" | "superhero" | "dreamy"];
    return { image: base, extras: { edited: await sampleImage(size, variant) } };
  }
  if (e.ai === "eyes") return { image: base, extras: { eyes: SAMPLE_EYES } };
  return { image: base, extras: {} };
}
