import type { PaymentProvider } from "./types";

/** Development only: every payment succeeds instantly and no money moves. */
export const mockPayment: PaymentProvider = {
  name: "mock",
  label: "test payment (no money moves)",
  async createCheckout({ orderRef }) {
    return { paid: true, providerRef: `mock_${orderRef}` };
  },
  async verify({ orderRef }) {
    return { status: "PAID", providerRef: `mock_${orderRef}` };
  },
  async refund() {
    return "REFUNDED";
  },
};
