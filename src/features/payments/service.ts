import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getPaymentProvider, type OrderInfo, type Redirect } from "@/services/payment";
import { ReadinessError, assertReadyToPay } from "@/features/generation/readiness";
import { getEffect } from "@/features/effects/catalog";
import { pkrFor } from "./pricing";
import { canMove, makeOrderRef, receiptRef, type PayStatus } from "./state";

/**
 * Pakistan-first, pay-first flow (Easypaisa takes the money up front):
 *   startPayment  -> checks everything BEFORE money moves, creates ONE payment, sends the customer to the gateway
 *   settlePayment -> asks the gateway (server to server) what happened; only a verified PAID queues the job
 *   capturePayment-> GIF delivered: the sale is final
 *   refundPayment -> GIF failed: refund automatically, or flag it REFUND_DUE for a person to refund in the portal
 * Every transition is a guarded update, so duplicate callbacks, double clicks and retries never double-charge or double-queue.
 */

export class PaymentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
type PaymentRow = NonNullable<Awaited<ReturnType<typeof db.payment.findUnique>>>;

const toOrder = (p: PaymentRow): OrderInfo => ({ paymentId: p.id, orderRef: p.providerOrderId ?? makeOrderRef(p.id), amountPkr: p.amountPkr, providerRef: p.providerRef });
const newPaymentId = () => `p${randomBytes(10).toString("hex")}`;

export type StartResult = { status: string; paymentStatus: string; redirect?: Redirect; payLabel: string };

export async function startPayment(generationId: string, guestSessionId: string, userId: string | null = null): Promise<StartResult> {
  const provider = getPaymentProvider();
  const gen = await db.generation.findUnique({ where: { id: generationId } });
  if (!gen || gen.guestSessionId !== guestSessionId) throw new PaymentError("Not found", 404);
  // Accounts: a personalized GIF can only be downloaded by a signed-in customer; the GIF then belongs to that account.
  if (gen.kind === "personal" && env.requireLogin) {
    if (!userId) throw new PaymentError("Please sign in to download your GIF.", 401);
    if (gen.userId && gen.userId !== userId) throw new PaymentError("Not found", 404);
  }
  if (userId && gen.kind === "personal" && !gen.userId) {
    await db.generation.update({ where: { id: gen.id }, data: { userId, expiresAt: new Date(Date.now() + env.accountRetentionDays * 86_400_000) } });
  }
  if (gen.status !== "DRAFT") return { status: gen.status, paymentStatus: gen.paymentStatus, payLabel: provider.label }; // already paid / running / done: never charge twice

  try {
    await assertReadyToPay(gen);
  } catch (e) {
    if (e instanceof ReadinessError) throw new PaymentError(e.message, e.status);
    throw e;
  }

  // Free mode (PAYMENT_REQUIRED="false"): personalized GIFs unlock directly. Server decides; the browser cannot force it.
  if (!env.paymentRequired && gen.kind === "personal") {
    await db.generation.updateMany({ where: { id: gen.id, status: "DRAFT" }, data: { status: "COMPLETED", completedAt: new Date() } });
    return resultFor(generationId, "Free");
  }

  // A payment already waiting for this creation? Re-use it (double click, back button) instead of opening a second one.
  const waiting = await db.payment.findFirst({ where: { generationId, status: "PENDING" }, orderBy: { createdAt: "desc" } });
  if (waiting) {
    const settled = await settlePayment(waiting.id);
    if (settled && settled.status !== "PENDING") return resultFor(generationId, provider.label);
    return checkoutFor(waiting, gen.id, provider);
  }

  const attempt = await db.payment.count({ where: { generationId } });
  const id = newPaymentId();
  const amountPkr = pkrFor(Number(gen.priceUsd));
  let payment: PaymentRow;
  try {
    payment = await db.payment.create({
      data: {
        id,
        generationId,
        provider: provider.name,
        providerOrderId: makeOrderRef(id),
        idempotencyKey: `gen:${gen.id}:pay:${attempt}`,
        amountUsd: gen.priceUsd,
        amountPkr,
        currency: "PKR",
        status: "PENDING",
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return resultFor(generationId, provider.label); // a concurrent request won the race
    throw e;
  }
  await db.generation.update({ where: { id: gen.id }, data: { paymentStatus: "PENDING" } });
  return checkoutFor(payment, gen.id, provider);
}

async function checkoutFor(payment: PaymentRow, generationId: string, provider: ReturnType<typeof getPaymentProvider>): Promise<StartResult> {
  const effect = getEffect((await db.generation.findUnique({ where: { id: generationId }, select: { effect: true } }))?.effect ?? "");
  try {
    const out = await provider.createCheckout({
      ...toOrder(payment),
      description: `MotionMagic GIF${effect ? `: ${effect.name}` : ""}`.slice(0, 80),
      returnUrl: `${env.appUrl}/api/payments/return?p=${encodeURIComponent(payment.id)}`,
    });
    if (out.paid) {
      await markPaid(payment.id, out.providerRef);
      return resultFor(generationId, provider.label);
    }
    return { status: "DRAFT", paymentStatus: "PENDING", redirect: out.redirect, payLabel: provider.label };
  } catch (e) {
    console.error(`[payments] checkout failed for ${payment.id}`, e instanceof Error ? e.message : e);
    await move(payment.id, "PENDING", "FAILED", { failureReason: "Could not start checkout" });
    await db.generation.update({ where: { id: generationId }, data: { paymentStatus: "FAILED" } });
    throw new PaymentError("We could not start the payment. You have not been charged. Please try again.", 502);
  }
}

async function resultFor(generationId: string, payLabel: string): Promise<StartResult> {
  const g = await db.generation.findUniqueOrThrow({ where: { id: generationId } });
  return { status: g.status, paymentStatus: g.paymentStatus, payLabel };
}

/** Guarded status change. Returns true only for the one caller that actually made the move. */
async function move(id: string, from: PayStatus | PayStatus[], to: PayStatus, extra: Record<string, unknown> = {}): Promise<boolean> {
  const froms = Array.isArray(from) ? from : [from];
  const allowed = froms.filter((f) => canMove(f, to));
  if (!allowed.length) return false;
  const res = await db.payment.updateMany({ where: { id, status: { in: allowed } }, data: { status: to, ...extra } });
  return res.count === 1;
}

/** Verified PAID: queue the creation exactly once. */
async function markPaid(paymentId: string, providerRef?: string, raw?: string) {
  const won = await move(paymentId, ["PENDING", "EXPIRED"], "AUTHORIZED", { providerRef: providerRef ?? null, paidAt: new Date(), rawStatus: raw ?? null, failureReason: null });
  if (!won) return;
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
  const gen0 = await db.generation.findUnique({ where: { id: payment.generationId }, select: { kind: true } });
  // Personalized GIFs are drawn on demand at download time, so they never go through the worker: paid = ready.
  const next = gen0?.kind === "personal" ? { status: "COMPLETED", completedAt: new Date() } : { status: "QUEUED" };
  const queued = await db.generation.updateMany({ where: { id: payment.generationId, status: "DRAFT" }, data: { paymentStatus: "AUTHORIZED", ...next } });
  if (queued.count === 0) {
    // Money arrived but the creation cannot run (already paid by another attempt, expired or deleted): give it back.
    await move(paymentId, "AUTHORIZED", "REFUND_DUE", { failureReason: "Creation was already paid or no longer available" });
    console.error(`[payments] ${paymentId} paid but generation ${payment.generationId} is not queueable: refund due`);
  }
}

/** Asks the gateway what really happened and applies it. Safe to call any number of times, from any source. */
export async function settlePayment(paymentId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  if (payment.status !== "PENDING" && payment.status !== "EXPIRED") return payment; // already decided

  let result;
  try {
    result = await getPaymentProvider().verify(toOrder(payment));
  } catch (e) {
    console.error(`[payments] verify failed for ${paymentId}`, e instanceof Error ? e.message : e);
    return payment; // gateway unreachable: stay pending, the reconciler tries again
  }

  if (result.status === "PAID") {
    if (result.amountPkr !== undefined && result.amountPkr !== payment.amountPkr) {
      await move(paymentId, ["PENDING", "EXPIRED"], "REFUND_DUE", { failureReason: `Amount mismatch: expected ${payment.amountPkr}, gateway took ${result.amountPkr}`, rawStatus: result.raw ?? null, providerRef: result.providerRef ?? null });
      await db.generation.update({ where: { id: payment.generationId }, data: { paymentStatus: "REFUND_DUE" } });
    } else {
      await markPaid(paymentId, result.providerRef, result.raw);
    }
  } else if (result.status === "FAILED" || result.status === "CANCELLED") {
    if (await move(paymentId, "PENDING", result.status, { rawStatus: result.raw ?? null, failureReason: result.status === "FAILED" ? "Declined by the gateway" : "Cancelled by the customer" })) {
      await db.generation.updateMany({ where: { id: payment.generationId, status: "DRAFT" }, data: { paymentStatus: result.status } });
    }
  } else if (payment.status === "PENDING" && Date.now() - payment.createdAt.getTime() > env.paymentPendingMinutes * 60_000) {
    if (await move(paymentId, "PENDING", "EXPIRED", { rawStatus: result.raw ?? null })) {
      await db.generation.updateMany({ where: { id: payment.generationId, status: "DRAFT" }, data: { paymentStatus: "EXPIRED" } });
    }
  }
  return db.payment.findUnique({ where: { id: paymentId } });
}

/** Called when the GIF was delivered: the sale is final. (The money was taken up front.) */
export async function capturePayment(generationId: string) {
  const payment = await db.payment.findFirst({ where: { generationId, status: "AUTHORIZED" } });
  if (!payment) return;
  if (await move(payment.id, "AUTHORIZED", "CAPTURED")) await db.generation.update({ where: { id: generationId }, data: { paymentStatus: "CAPTURED" } });
}

/** Called when generation failed: refund automatically, or flag it for a person (REFUND_DUE) when the gateway needs that. */
export async function refundPayment(generationId: string) {
  const payment = await db.payment.findFirst({ where: { generationId, status: { in: ["AUTHORIZED", "CAPTURED"] } } });
  if (!payment) return;
  let outcome: "REFUNDED" | "MANUAL_REQUIRED" = "MANUAL_REQUIRED";
  try {
    outcome = await getPaymentProvider().refund(toOrder(payment));
  } catch (e) {
    console.error(`[payments] automatic refund failed for ${payment.id}`, e instanceof Error ? e.message : e);
  }
  const to: PayStatus = outcome === "REFUNDED" ? "REFUNDED" : "REFUND_DUE";
  const moved = await move(payment.id, ["AUTHORIZED", "CAPTURED"], to, to === "REFUNDED" ? { refundedAt: new Date() } : { failureReason: "Generation failed: refund this payment in the Easypaisa portal, then mark it refunded in /admin" });
  if (moved) await db.generation.update({ where: { id: generationId }, data: { paymentStatus: to } });
}

/** Admin: a person refunded it in the merchant portal. */
export async function markRefunded(paymentId: string): Promise<boolean> {
  const p = await db.payment.findUnique({ where: { id: paymentId } });
  if (!p || !(await move(paymentId, "REFUND_DUE", "REFUNDED", { refundedAt: new Date(), failureReason: null }))) return false;
  await db.generation.update({ where: { id: p.generationId }, data: { paymentStatus: "REFUNDED" } });
  return true;
}

/** Background safety net: customers who paid then closed the tab are still found, verified and served. */
export async function reconcilePayments(): Promise<{ checked: number; settled: number }> {
  const now = Date.now();
  const candidates = await db.payment.findMany({
    where: { OR: [{ status: "PENDING", createdAt: { lt: new Date(now - 2 * 60_000) } }, { status: "EXPIRED", createdAt: { gt: new Date(now - 24 * 3600_000) } }] },
    take: 50,
    orderBy: { createdAt: "asc" },
  });
  let settled = 0;
  for (const p of candidates) {
    const before = p.status;
    const after = await settlePayment(p.id);
    if (after && after.status !== before) settled++;
  }
  return { checked: candidates.length, settled };
}

/** What the customer-facing pages show about the latest payment of a creation. */
export async function paymentInfo(generationId: string) {
  const p = await db.payment.findFirst({ where: { generationId }, orderBy: { createdAt: "desc" } });
  if (!p) return null;
  return { status: p.status as PayStatus, amountPkr: p.amountPkr, receipt: receiptRef(p.providerOrderId), pending: p.status === "PENDING" };
}
