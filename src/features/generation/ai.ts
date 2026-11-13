import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorage } from "@/services/storage";
import { getToolbox } from "@/services/ai";
import { guestAiGenerationsToday } from "@/services/ai/quota";
import type { AiCtx } from "@/services/ai/types";
import type { Eyes } from "@/features/effects/render";
import type { ExtrasStore } from "./extras";

/** Writes EVERY AI attempt (successful or not) to ai_usage_logs: actual billed cost + paid-plan equivalent. */
export function makeAiCtx(generationId: string): AiCtx {
  return {
    log: async (u, success) => {
      await db.aiUsageLog.create({
        data: {
          generationId,
          provider: u.provider,
          model: u.model,
          step: u.step,
          costUsd: u.costUsd,
          notionalCostUsd: u.notionalCostUsd,
          inputTokens: u.inputTokens,
          outputTokens: u.outputTokens,
          success,
        },
      });
    },
  };
}

/** Sum of all AI calls for one generation (design + eyes + edit + video, including failed attempts). */
export async function generationAiTotals(generationId: string) {
  const agg = await db.aiUsageLog.aggregate({ _sum: { costUsd: true, notionalCostUsd: true }, where: { generationId } });
  return { costUsd: Number(agg._sum.costUsd ?? 0), notionalCostUsd: Number(agg._sum.notionalCostUsd ?? 0) };
}

/** Remembers AI results for one generation: edited photos in private storage, eye positions in options. */
export function makeExtrasStore(generationId: string): ExtrasStore {
  const storage = getStorage();
  const key = (kind: string) => `ai/${generationId}/edited-${kind}.png`;
  return {
    async getEdited(kind) {
      try {
        return await storage.get(key(kind));
      } catch {
        return null;
      }
    },
    async putEdited(kind, image) {
      await storage.put(key(kind), image);
      await db.generatedAsset.create({ data: { generationId, kind: "ai-image", storageKey: key(kind), bytes: image.length } });
    },
    async getEyes() {
      const g = await db.generation.findUnique({ where: { id: generationId }, select: { options: true } });
      return ((g?.options ?? {}) as { eyes?: Eyes }).eyes ?? null;
    },
    async putEyes(eyes) {
      const g = await db.generation.findUniqueOrThrow({ where: { id: generationId }, select: { options: true } });
      await db.generation.update({ where: { id: generationId }, data: { options: { ...((g.options ?? {}) as object), eyes } } });
    },
  };
}

export class GuestAiLimitError extends Error {
  status = 429;
}

/**
 * Free-tier protection: a guest may use AI on a limited number of different creations per day.
 * A creation that already used AI today can keep using it (reuses cached results, edits, previews).
 */
export async function assertGuestAiAllowance(guestSessionId: string, generationId: string) {
  if (env.aiMode === "mock") return;
  const used = await guestAiGenerationsToday(guestSessionId);
  if (!used.includes(generationId) && used.length >= env.maxAiGenerationsPerGuestPerDay) {
    throw new GuestAiLimitError(
      `You have reached today's limit of ${env.maxAiGenerationsPerGuestPerDay} AI creations. Built-in effects are still available, and AI resets tomorrow.`,
    );
  }
}

export { getToolbox };
