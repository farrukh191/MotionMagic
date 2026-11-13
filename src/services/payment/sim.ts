import { db } from "@/lib/db";
import type { PaymentProvider } from "./types";

/**
 * Sandbox simulator for the redirect flow. It behaves like a hosted wallet checkout:
 * the customer is sent to /pay/sim, chooses Pay / Fail / Cancel, and comes back. Our code then VERIFIES the result
 * through verify() exactly as it will with the real gateway. Blocked in production unless ALLOW_PAYMENT_SIM=true.
 */
export const simPayment: PaymentProvider = {
  name: "easypaisa-sim",
  label: "Easypaisa (sandbox simulator)",
  async createCheckout({ paymentId, returnUrl }) {
    return { redirect: { url: `/pay/sim?p=${encodeURIComponent(paymentId)}&r=${encodeURIComponent(returnUrl)}`, method: "GET" } };
  },
  async verify({ paymentId }) {
    const p = await db.payment.findUnique({ where: { id: paymentId }, select: { rawStatus: true } });
    if (p?.rawStatus === "SIM_PAID") return { status: "PAID", providerRef: `sim_${paymentId}`, raw: p.rawStatus };
    if (p?.rawStatus === "SIM_FAILED") return { status: "FAILED", raw: p.rawStatus };
    if (p?.rawStatus === "SIM_CANCELLED") return { status: "CANCELLED", raw: p.rawStatus };
    return { status: "PENDING", raw: p?.rawStatus ?? "" };
  },
  async refund() {
    return "MANUAL_REQUIRED"; // like the real thing: a person refunds it, then marks it done in /admin
  },
};
