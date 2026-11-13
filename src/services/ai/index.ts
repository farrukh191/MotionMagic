import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { falProvider } from "./fal-provider";
import { liveToolbox } from "./live-toolbox";
import { mockToolbox } from "./mock-toolbox";
import { mockProvider } from "./mock-provider";
import type { AiToolbox, MotionProvider } from "./types";

export function getMotionProvider(): MotionProvider {
  return env.aiMode === "live" ? falProvider : mockProvider;
}

export function getToolbox(): AiToolbox {
  return env.aiMode === "live" ? liveToolbox : mockToolbox;
}

/** Spend since the start of the current calendar month. */
export async function monthlySpendUsd(): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const agg = await db.aiUsageLog.aggregate({
    _sum: { costUsd: true },
    where: { createdAt: { gte: start } },
  });
  return Number(agg._sum.costUsd ?? 0);
}

/** Throws if expensive AI calls are currently not allowed. */
export async function assertAiAllowed(expectedCostUsd: number): Promise<void> {
  if (env.aiMode === "mock") return;
  if (env.aiKillSwitch) throw new Error("AI generation is temporarily disabled.");
  const spent = await monthlySpendUsd();
  if (spent + expectedCostUsd > env.aiMonthlyBudgetUsd) {
    throw new Error("AI budget limit reached.");
  }
}
