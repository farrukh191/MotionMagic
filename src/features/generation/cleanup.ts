import { db } from "@/lib/db";
import { getStorage } from "@/services/storage";
import { reconcilePayments, refundPayment } from "@/features/payments/service";
import { pruneDesignCache } from "./design-cache";

/** Deletes every stored file for a generation (original, outputs, assets). */
export async function deleteGenerationFiles(generationId: string): Promise<void> {
  const storage = getStorage();
  const gen = await db.generation.findUnique({
    where: { id: generationId },
    include: { assets: true },
  });
  if (!gen) return;
  const keys = new Set<string>(gen.assets.map((a) => a.storageKey));
  if (gen.originalKey && gen.originalKey !== "pending" && gen.originalKey !== "none") keys.add(gen.originalKey);
  if (gen.outputKey) keys.add(gen.outputKey);
  for (const key of keys) await storage.delete(key);
  await storage.deletePrefix(`previews/${generationId}`);
  await storage.deletePrefix(`ai/${generationId}`);
  await storage.deletePrefix(`business/${generationId}`);
  await db.generatedAsset.deleteMany({ where: { generationId } });
}

/** Expires old generations and recovers jobs stuck in PROCESSING. */
export async function runCleanup(): Promise<{ expired: number; recovered: number; paymentsSettled: number }> {
  const now = new Date();
  const pay = await reconcilePayments().catch((e) => {
    console.error("[cleanup] payment reconcile failed", e);
    return { checked: 0, settled: 0 };
  });

  // Jobs stuck in PROCESSING for 15+ minutes: fail them and release the payment.
  const stuckBefore = new Date(now.getTime() - 15 * 60 * 1000);
  const stuck = await db.generation.findMany({
    where: { status: "PROCESSING", processingStartedAt: { lt: stuckBefore } },
    select: { id: true },
  });
  let recovered = 0;
  for (const { id } of stuck) {
    const res = await db.generation.updateMany({
      where: { id, status: "PROCESSING" },
      data: { status: "FAILED", errorMessage: "Generation failed. You have not been charged. Please try again." },
    });
    if (res.count === 1) {
      await refundPayment(id).catch((e) => console.error(`[cleanup] refund failed for ${id}`, e));
      recovered++;
    }
  }

  // Retention: delete files of expired generations.
  const expiredList = await db.generation.findMany({
    where: { expiresAt: { lt: now }, status: { not: "EXPIRED" } },
    select: { id: true, status: true },
  });
  let expired = 0;
  for (const g of expiredList) {
    if (g.status === "QUEUED" || g.status === "PROCESSING") continue; // never delete work in flight
    await deleteGenerationFiles(g.id);
    await db.generation.update({
      where: { id: g.id },
      data: { status: "EXPIRED", originalKey: "deleted", outputKey: null },
    });
    expired++;
  }
  await pruneDesignCache().catch((e) => console.error("[cleanup] design cache prune failed", e));
  return { expired, recovered, paymentsSettled: pay.settled };
}
