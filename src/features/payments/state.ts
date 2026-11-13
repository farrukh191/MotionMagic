export type PayStatus = "NONE" | "PENDING" | "AUTHORIZED" | "CAPTURED" | "REFUNDED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUND_DUE";

/** Allowed moves of a payment. Anything else is a bug (or a duplicate callback) and is ignored. */
const NEXT: Record<PayStatus, PayStatus[]> = {
  NONE: ["PENDING"],
  PENDING: ["AUTHORIZED", "FAILED", "CANCELLED", "EXPIRED", "REFUND_DUE"],
  AUTHORIZED: ["CAPTURED", "REFUNDED", "REFUND_DUE"],
  CAPTURED: ["REFUNDED", "REFUND_DUE"],
  REFUND_DUE: ["REFUNDED"],
  REFUNDED: [],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: ["AUTHORIZED"], // a customer can still finish paying after we gave up waiting; money is never ignored
};

export const canMove = (from: PayStatus, to: PayStatus) => NEXT[from].includes(to);

/** Orders of 4 to 20 letters/digits, unique per payment attempt (Easypaisa limits the reference length). */
export function makeOrderRef(paymentId: string): string {
  return `MM${paymentId.replace(/[^a-z0-9]/gi, "").slice(-14).toUpperCase()}`;
}

/** Short reference shown to the customer on receipts and used by support. */
export const receiptRef = (orderRef: string | null | undefined) => (orderRef ? orderRef.replace(/^MM/, "MM-").slice(0, 11) : "");
