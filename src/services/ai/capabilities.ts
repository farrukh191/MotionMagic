import { env } from "@/lib/env";
import type { Caps } from "@/features/effects/catalog";
import { providerHasCapacity } from "./quota";

const NONE: Caps = { text: false, eyes: false, imageEdit: false, motion: false };

/** What the AI layer can do RIGHT NOW (keys present, free daily quota left, kill switch off). */
export async function getCaps(): Promise<Caps> {
  if (env.aiMode === "mock") return { text: true, eyes: true, imageEdit: true, motion: true };
  if (env.aiKillSwitch) return NONE;
  const [gemini, groq, geminiImage] = await Promise.all([
    providerHasCapacity("gemini", "text"),
    providerHasCapacity("groq", "text"),
    env.geminiImageEnabled ? providerHasCapacity("gemini", "image") : Promise.resolve(false),
  ]);
  const text = gemini || groq;
  return { text, eyes: text, imageEdit: geminiImage, motion: Boolean(env.falKey) };
}
