import { env } from "@/lib/env";
import { easypaisaPayment } from "./easypaisa";
import { mockPayment } from "./mock";
import { simPayment } from "./sim";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, CheckoutInput, CheckoutResult, Redirect, VerifyResult, OrderInfo } from "./types";

/** PAYMENT_PROVIDER = "mock" (default, dev) | "easypaisa-sim" (sandbox simulator) | "easypaisa" (real gateway). */
export function getPaymentProvider(): PaymentProvider {
  switch (env.paymentProvider) {
    case "mock":
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
        throw new Error('PAYMENT_PROVIDER="mock" takes no money. Use "easypaisa" in production (or set ALLOW_MOCK_PAYMENTS=true for a demo).');
      }
      return mockPayment;
    case "easypaisa-sim":
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_PAYMENT_SIM !== "true") {
        throw new Error('PAYMENT_PROVIDER="easypaisa-sim" is a simulator. Use "easypaisa" in production.');
      }
      return simPayment;
    case "easypaisa":
      return easypaisaPayment;
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER "${env.paymentProvider}"`);
  }
}
