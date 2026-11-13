import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PKR_PER_USD, formatPkr } from "./pricing";

export type EffectRow = { effect: string; orders: number; revenuePkr: number; aiBilledUsd: number; aiNotionalUsd: number };

/** Last-N-days money report: what customers paid, what the AI really cost (billed and paid-equivalent), and the margin. */
export async function buildReport(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const paid = await db.payment.findMany({
    where: { status: { in: ["AUTHORIZED", "CAPTURED", "REFUNDED", "REFUND_DUE"] }, paidAt: { gte: since } },
    include: { generation: { select: { effect: true, aiCostUsd: true, aiNotionalCostUsd: true, status: true } } },
  });
  let revenue = 0, refunded = 0, refundDue = 0, billed = 0, notional = 0;
  const byEffect = new Map<string, EffectRow>();
  for (const p of paid) {
    const g = p.generation;
    const row = byEffect.get(g.effect) ?? { effect: g.effect, orders: 0, revenuePkr: 0, aiBilledUsd: 0, aiNotionalUsd: 0 };
    billed += Number(g.aiCostUsd ?? 0);
    notional += Number(g.aiNotionalCostUsd ?? 0);
    row.aiBilledUsd += Number(g.aiCostUsd ?? 0);
    row.aiNotionalUsd += Number(g.aiNotionalCostUsd ?? 0);
    if (p.status === "REFUNDED") refunded += p.amountPkr;
    else if (p.status === "REFUND_DUE") refundDue += p.amountPkr;
    else {
      revenue += p.amountPkr;
      row.orders++;
      row.revenuePkr += p.amountPkr;
    }
    byEffect.set(g.effect, row);
  }
  const fees = (revenue * env.paymentFeePercent) / 100;
  const aiCostPkr = billed * PKR_PER_USD;
  const aiNotionalPkr = notional * PKR_PER_USD;
  return {
    days,
    revenuePkr: revenue,
    refundedPkr: refunded,
    refundDuePkr: refundDue,
    aiBilledUsd: billed,
    aiNotionalUsd: notional,
    feesPkr: Math.round(fees),
    marginPkr: Math.round(revenue - fees - aiCostPkr), // what you really kept (free tiers bill $0)
    marginIfPaidAiPkr: Math.round(revenue - fees - aiNotionalPkr), // what you would keep once AI is on paid plans
    byEffect: [...byEffect.values()].sort((a, b) => b.revenuePkr - a.revenuePkr),
    text: `${formatPkr(revenue)} in, ${formatPkr(refunded)} refunded`,
  };
}

export async function refundsDue() {
  const rows = await db.payment.findMany({ where: { status: "REFUND_DUE" }, orderBy: { createdAt: "asc" }, take: 100 });
  return rows.map((p) => ({ id: p.id, orderRef: p.providerOrderId, amountPkr: p.amountPkr, reason: p.failureReason, generationId: p.generationId, paidAt: p.paidAt }));
}
