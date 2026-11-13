/**
 * Payment checks with an in-memory database and the Easypaisa simulator (no network, no real Prisma needed).
 * Covers: one payment per creation, verify-before-trust, duplicate callbacks, failed/cancelled/expired/late payments,
 * amount mismatch, double payment, refunds, reconciliation, PKR pricing, the gateway signature and the profit report.
 * Run: npm run test:payments
 */
type Row = Record<string, any>;

const tables: Record<string, Row[]> = { generation: [], payment: [] };
const match = (row: Row, where: Row = {}): boolean =>
  Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Row[]).some((w) => match(row, w));
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if ("in" in v) return v.in.includes(row[k]);
      if ("lt" in v) return row[k] < v.lt;
      if ("gt" in v) return row[k] > v.gt;
      if ("gte" in v) return row[k] >= v.gte;
      if ("not" in v) return row[k] !== v.not;
    }
    return row[k] === v;
  });
const table = (name: string) => ({
  create: async ({ data }: Row) => {
    if (tables[name].some((r) => (data.idempotencyKey && r.idempotencyKey === data.idempotencyKey) || (data.providerOrderId && r.providerOrderId === data.providerOrderId)))
      throw Object.assign(new Error("unique"), { code: "P2002" });
    const row = { createdAt: new Date(), updatedAt: new Date(), status: "PENDING", providerRef: null, paidAt: null, refundedAt: null, rawStatus: null, failureReason: null, ...data };
    tables[name].push(row);
    return row;
  },
  findUnique: async ({ where }: Row) => tables[name].find((r) => match(r, where)) ?? null,
  findUniqueOrThrow: async ({ where }: Row) => {
    const r = tables[name].find((x) => match(x, where));
    if (!r) throw new Error("not found");
    return r;
  },
  findFirst: async ({ where, orderBy }: Row) => {
    const rows = tables[name].filter((r) => match(r, where));
    if (orderBy?.createdAt === "desc") rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows[0] ?? null;
  },
  findMany: async ({ where, include }: Row = {}) =>
    tables[name].filter((r) => match(r, where)).map((r) => (include?.generation ? { ...r, generation: tables.generation.find((g) => g.id === r.generationId) } : r)),
  count: async ({ where }: Row = {}) => tables[name].filter((r) => match(r, where)).length,
  update: async ({ where, data }: Row) => {
    const r = tables[name].find((x) => match(x, where));
    if (!r) throw new Error("not found");
    Object.assign(r, data);
    return r;
  },
  updateMany: async ({ where, data }: Row) => {
    const rows = tables[name].filter((r) => match(r, where));
    rows.forEach((r) => Object.assign(r, data));
    return { count: rows.length };
  },
});
(globalThis as any).prisma = { generation: table("generation"), payment: table("payment") };
process.env.PAYMENT_PROVIDER = "easypaisa-sim";
process.env.NODE_ENV = "test";
process.env.ALLOW_PAYMENT_SIM = "true";
process.env.AI_MODE = "mock";

let failed = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) failed++;
};

let n = 0;
const draft = (over: Row = {}) => {
  const g = { id: `g${++n}`, guestSessionId: "s1", effect: "flying-hearts", kind: "viral", status: "DRAFT", paymentStatus: "NONE", priceUsd: 0.29, options: {}, originalKey: "k", ...over };
  tables.generation.push(g);
  return g;
};
const simulate = (paymentId: string, outcome: "SIM_PAID" | "SIM_FAILED" | "SIM_CANCELLED") => {
  tables.payment.find((p) => p.id === paymentId)!.rawStatus = outcome;
};

async function main() {
  const svc = await import("@/features/payments/service");
  const { pkrFor, formatPkr } = await import("@/features/payments/pricing");
  const { canMove, makeOrderRef } = await import("@/features/payments/state");
  const { simPayment } = await import("@/services/payment/sim");
  const { buildHostedCheckout, epHash, epAmount } = await import("@/services/payment/easypaisa");
  const { buildReport } = await import("@/features/payments/report");
  const { getEffect } = await import("@/features/effects/catalog");

  console.log("\n[1] Rupee pricing");
  const flying = getEffect("flying-hearts")!;
  check(pkrFor(0.29) % 10 === 0 && pkrFor(0.29) >= 30, `0.29 USD shows as ${formatPkr(pkrFor(0.29))} (rounded up to Rs. 10)`);
  check(formatPkr(1250) === "Rs. 1,250" && formatPkr(99) === "Rs. 99", "rupee formatting");
  check(pkrFor(0.001) === 30, "never below Rs. 30");

  console.log("\n[2] State machine");
  check(canMove("PENDING", "AUTHORIZED") && !canMove("FAILED", "AUTHORIZED") && !canMove("REFUNDED", "CAPTURED"), "allowed and forbidden moves");
  check(canMove("EXPIRED", "AUTHORIZED"), "a late payment is still honoured");
  check(/^MM[A-Z0-9]{4,18}$/.test(makeOrderRef("pabc123def456ghi789")), "order reference is 4 to 20 letters/digits");

  console.log("\n[3] Starting a payment");
  const g1 = draft({ priceUsd: flying.priceUsd });
  const r1 = await svc.startPayment(g1.id, "s1");
  check(r1.redirect?.url.startsWith("/pay/sim?") === true && r1.status === "DRAFT", "customer is sent to the gateway, creation stays a draft");
  check(tables.payment.length === 1 && tables.payment[0].amountPkr === pkrFor(Number(g1.priceUsd)) && tables.payment[0].currency === "PKR", "one payment row in PKR");
  const r1b = await svc.startPayment(g1.id, "s1");
  check(tables.payment.length === 1 && Boolean(r1b.redirect), "double click re-uses the same payment (no second charge)");
  let threw = false;
  await svc.startPayment(g1.id, "someone-else").catch(() => (threw = true));
  check(threw, "another visitor cannot pay for this creation");

  console.log("\n[4] Never trust the browser");
  const p1 = tables.payment[0];
  await svc.settlePayment(p1.id);
  check(p1.status === "PENDING" && g1.status === "DRAFT", "returning from the gateway without paying changes nothing");

  console.log("\n[5] Verified payment queues the job exactly once");
  simulate(p1.id, "SIM_PAID");
  for (let i = 0; i < 4; i++) await svc.settlePayment(p1.id); // duplicate callbacks / refreshes
  check(p1.status === "AUTHORIZED" && g1.status === "QUEUED" && g1.paymentStatus === "AUTHORIZED", "paid -> authorized, creation queued");
  g1.status = "PROCESSING"; // a worker picked it up
  await svc.settlePayment(p1.id);
  check(g1.status === "PROCESSING", "a repeated callback never re-queues a running job");
  const again = await svc.startPayment(g1.id, "s1");
  check(again.status === "PROCESSING" && tables.payment.length === 1, "pressing Pay again after paying never charges twice");

  console.log("\n[6] Delivered = captured; failed = refund flagged");
  await svc.capturePayment(g1.id);
  check(p1.status === "CAPTURED" && g1.paymentStatus === "CAPTURED", "GIF delivered -> sale final");
  const g2 = draft({ priceUsd: flying.priceUsd });
  await svc.startPayment(g2.id, "s1");
  const p2 = tables.payment[1];
  simulate(p2.id, "SIM_PAID");
  await svc.settlePayment(p2.id);
  await svc.refundPayment(g2.id);
  check(p2.status === "REFUND_DUE" && /refund/i.test(p2.failureReason ?? ""), "generation failed -> refund is flagged for a person");
  check(await svc.markRefunded(p2.id), "admin marks it refunded");
  check(p2.status === "REFUNDED" && g2.paymentStatus === "REFUNDED" && !(await svc.markRefunded(p2.id)), "refund can only be completed once");

  console.log("\n[7] Failed and cancelled payments leave the creation retryable");
  const g3 = draft({ priceUsd: flying.priceUsd });
  await svc.startPayment(g3.id, "s1");
  const p3 = tables.payment[2];
  simulate(p3.id, "SIM_FAILED");
  await svc.settlePayment(p3.id);
  check(p3.status === "FAILED" && g3.status === "DRAFT", "declined -> FAILED, still a draft");
  await svc.startPayment(g3.id, "s1");
  const p3b = tables.payment[3];
  check(p3b.id !== p3.id && p3b.providerOrderId !== p3.providerOrderId && p3b.status === "PENDING", "retry opens a fresh payment with a new order reference");
  simulate(p3b.id, "SIM_CANCELLED");
  await svc.settlePayment(p3b.id);
  check(p3b.status === "CANCELLED" && g3.status === "DRAFT", "cancelled -> CANCELLED, still a draft");

  console.log("\n[8] Expired, then paid late");
  const g4 = draft({ priceUsd: flying.priceUsd });
  await svc.startPayment(g4.id, "s1");
  const p4 = tables.payment[4];
  p4.createdAt = new Date(Date.now() - 60 * 60_000);
  await svc.settlePayment(p4.id);
  check(p4.status === "EXPIRED", "no answer for too long -> EXPIRED");
  simulate(p4.id, "SIM_PAID");
  await svc.settlePayment(p4.id);
  check(p4.status === "AUTHORIZED" && g4.status === "QUEUED", "money that arrives late is honoured, not ignored");

  console.log("\n[9] Suspicious or duplicate money is refunded, never used");
  const g5 = draft({ priceUsd: flying.priceUsd });
  await svc.startPayment(g5.id, "s1");
  const p5 = tables.payment[5];
  const realVerify = simPayment.verify;
  simPayment.verify = async () => ({ status: "PAID", providerRef: "x", amountPkr: p5.amountPkr - 10 });
  await svc.settlePayment(p5.id);
  simPayment.verify = realVerify;
  check(p5.status === "REFUND_DUE" && g5.status === "DRAFT" && /mismatch/i.test(p5.failureReason), "gateway took a different amount -> not accepted, refund flagged");
  const g6 = draft({ priceUsd: flying.priceUsd });
  await svc.startPayment(g6.id, "s1");
  const pa = tables.payment[6];
  const pb = await (globalThis as any).prisma.payment.create({ data: { id: "pdup", generationId: g6.id, provider: "easypaisa-sim", providerOrderId: "MMDUP0001", idempotencyKey: "dup", amountPkr: pa.amountPkr, currency: "PKR" } });
  simulate(pa.id, "SIM_PAID");
  simulate(pb.id, "SIM_PAID");
  await svc.settlePayment(pa.id);
  await svc.settlePayment(pb.id);
  check(g6.status === "QUEUED" && pa.status === "AUTHORIZED" && pb.status === "REFUND_DUE", "two payments for one creation: one used, the other flagged for refund");

  console.log("\n[10] Reconciliation finds customers who paid and closed the tab");
  const g7 = draft({ priceUsd: flying.priceUsd });
  await svc.startPayment(g7.id, "s1");
  const p7 = tables.payment.at(-1)!;
  p7.createdAt = new Date(Date.now() - 5 * 60_000);
  simulate(p7.id, "SIM_PAID");
  const rec = await svc.reconcilePayments();
  check(p7.status === "AUTHORIZED" && g7.status === "QUEUED" && rec.settled >= 1, "background check settles it and queues the GIF");

  console.log("\n[11] Easypaisa request signing");
  const a = buildHostedCheckout({ paymentId: "p", orderRef: "MMTEST0001", amountPkr: 90, description: "x", returnUrl: "https://x.test/r" }, new Date("2026-11-05T05:00:00Z"), { storeId: "123", hashKey: "0123456789abcdef", username: "", password: "", accountNum: "", sandbox: true, checkoutUrl: "https://sandbox/pay", inquiryUrl: "" });
  const b = buildHostedCheckout({ paymentId: "p", orderRef: "MMTEST0001", amountPkr: 90, description: "x", returnUrl: "https://x.test/r" }, new Date("2026-11-05T05:00:00Z"), { storeId: "123", hashKey: "0123456789abcdef", username: "", password: "", accountNum: "", sandbox: true, checkoutUrl: "https://sandbox/pay", inquiryUrl: "" });
  check(a.params.merchantHashedReq === b.params.merchantHashedReq && a.params.amount === "90.0" && a.params.orderRefNum === "MMTEST0001", "signed request is deterministic and carries our order reference");
  check(epAmount(1250) === "1250.0", "amount format");
  let bad = false;
  try { epHash({ a: "b" }, "short"); } catch { bad = true; }
  check(bad, "a wrong-length hash key is refused");

  console.log("\n[12] Profit report");
  tables.generation.find((g) => g.id === g1.id)!.aiCostUsd = 0;
  tables.generation.find((g) => g.id === g1.id)!.aiNotionalCostUsd = 0.04;
  const rep = await buildReport(30);
  check(rep.revenuePkr > 0 && rep.refundedPkr > 0 && rep.refundDuePkr > 0, `revenue ${rep.revenuePkr}, refunded ${rep.refundedPkr}, refund due ${rep.refundDuePkr} (PKR)`);
  check(rep.marginIfPaidAiPkr <= rep.marginPkr, "margin on paid AI is never above margin on free AI");

  if (failed) {
    console.error(`\n${failed} CHECK(S) FAILED`);
    process.exit(1);
  }
  console.log("\nALL PAYMENT CHECKS PASSED");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
