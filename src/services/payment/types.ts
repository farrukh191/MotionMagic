export type CheckoutInput = {
  paymentId: string;
  /** Reference sent to the gateway: 4 to 20 letters/digits, unique per attempt. */
  orderRef: string;
  amountPkr: number;
  description: string;
  /** Where the gateway sends the customer (and its notification) after payment. */
  returnUrl: string;
};

export type Redirect = { url: string; method: "GET" | "POST"; fields?: Record<string, string> };

export type CheckoutResult = {
  /** Present when the customer must go to the gateway. Absent for instant providers (test mode). */
  redirect?: Redirect;
  /** Instant providers confirm immediately. */
  paid?: boolean;
  providerRef?: string;
};

export type VerifyResult = {
  status: "PAID" | "PENDING" | "FAILED" | "CANCELLED";
  providerRef?: string;
  /** Amount the gateway says it took (whole rupees), when it tells us. A mismatch is never accepted. */
  amountPkr?: number;
  raw?: string;
};

export type OrderInfo = { paymentId: string; orderRef: string; amountPkr: number; providerRef?: string | null };

/**
 * A wallet/redirect gateway (Easypaisa) takes the money up front: customer pays -> we verify server to server
 * -> we generate -> if generation fails we refund. There is no "authorize then capture" step.
 */
export interface PaymentProvider {
  name: string;
  /** Short text on the pay button, e.g. "Easypaisa". */
  label: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Asks the gateway (never trusts browser parameters) what really happened to this order. */
  verify(order: OrderInfo): Promise<VerifyResult>;
  /** REFUNDED: done automatically. MANUAL_REQUIRED: someone must refund it in the merchant portal. */
  refund(order: OrderInfo): Promise<"REFUNDED" | "MANUAL_REQUIRED">;
}
