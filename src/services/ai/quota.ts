import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type Provider = "gemini" | "groq";
export type Bucket = "text" | "image";

const utcDayStart = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/** Calls today (successful AND failed: both consume free-tier quota). */
export async function providerUsedToday(provider: Provider, bucket: Bucket): Promise<number> {
  const steps = provider === "gemini" ? (bucket === "image" ? ["image-edit"] : ["design", "eyes"]) : undefined;
  return db.aiUsageLog.count({
    where: { provider, createdAt: { gte: utcDayStart() }, ...(steps ? { step: { in: steps } } : {}) },
  });
}

export function providerLimit(provider: Provider, bucket: Bucket): number {
  if (provider === "groq") return env.groqDailyLimit;
  return bucket === "image" ? env.geminiImageDailyLimit : env.geminiTextDailyLimit;
}

export const providerConfigured = (p: Provider) => Boolean(p === "gemini" ? env.geminiKey : env.groqKey);

export async function providerHasCapacity(provider: Provider, bucket: Bucket): Promise<boolean> {
  if (!providerConfigured(provider)) return false;
  return (await providerUsedToday(provider, bucket)) < providerLimit(provider, bucket);
}

/** Distinct generations by this guest that already used AI today (previews count too). */
export async function guestAiGenerationsToday(guestSessionId: string): Promise<string[]> {
  const rows = await db.aiUsageLog.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, generation: { guestSessionId } },
    distinct: ["generationId"],
    select: { generationId: true },
  });
  return rows.map((r) => r.generationId);
}
