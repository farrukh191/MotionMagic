import { createCipheriv } from "node:crypto";
import { env } from "@/lib/env";
import type { CheckoutInput, OrderInfo, PaymentProvider, VerifyResult } from "./types";

/**
 * Easypaisa (Telenor Microfinance Bank) online payment adapter: hosted checkout + server-side inquiry.
 *
 * !! READ THIS BEFORE GOING LIVE !!
 * Easypaisa gives the exact technical contract (URLs, field names, hash algorithm, inquiry API, status codes)
 * only inside the merchant integration pack you receive after onboarding
 * (https://registerbusiness.easypaisa.com.pk/). This adapter follows the commonly documented "Easypay" hosted-checkout
 * shape and keeps every contract-specific detail in this ONE file, with URLs and credentials in .env.
 * Each place marked VERIFY must be checked against YOUR pack and tested in Easypaisa's sandbox.
 * The parts that do not depend on the contract (verify-before-trust, idempotent settling, refunds) live in
 * features/payments/service.ts and are tested with the simulator (PAYMENT_PROVIDER=easypaisa-sim).
 */

const cfg = {
  storeId: process.env.EASYPAISA_STORE_ID ?? "",
  hashKey: process.env.EASYPAISA_HASH_KEY ?? "", // 16 characters (AES-128)
  username: process.env.EASYPAISA_USERNAME ?? "",
  password: process.env.EASYPAISA_PASSWORD ?? "",
  accountNum: process.env.EASYPAISA_ACCOUNT_NUM ?? "",
  sandbox: (process.env.EASYPAISA_MODE ?? "sandbox") !== "production",
  // VERIFY: defaults are the commonly published addresses; override from your pack.
  checkoutUrl:
    process.env.EASYPAISA_CHECKOUT_URL ??
    ((process.env.EASYPAISA_MODE ?? "sandbox") !== "production"
      ? "https://easypaystg.easypaisa.com.pk/easypay/Index.jsf"
      : "https://easypay.easypaisa.com.pk/easypay/Index.jsf"),
  inquiryUrl:
    process.env.EASYPAISA_INQUIRY_URL ??
    ((process.env.EASYPAISA_MODE ?? "sandbox") !== "production"
      ? "https://easypaystg.easypaisa.com.pk/easypay-service/rest/v4/inquire-transaction"
      : "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/inquire-transaction"),
};

/** Easypaisa amounts are decimal strings with one decimal, e.g. 90 -> "90.0". VERIFY. */
export const epAmount = (pkr: number) => pkr.toFixed(1);

/** "yyyyMMdd HHmmss" in Pakistan time (UTC+5). VERIFY the exact format in your pack. */
export function epTimestamp(d: Date): string {
  const p = new Date(d.getTime() + 5 * 3600_000);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${p.getUTCFullYear()}${z(p.getUTCMonth() + 1)}${z(p.getUTCDate())} ${z(p.getUTCHours())}${z(p.getUTCMinutes())}${z(p.getUTCSeconds())}`;
}

/** AES-128-ECB (PKCS7) of the alphabetically sorted "k=v&k=v" string, base64. VERIFY against your pack. */
export function epHash(params: Record<string, string>, hashKey: string): string {
  if (Buffer.byteLength(hashKey) !== 16) throw new Error("EASYPAISA_HASH_KEY must be exactly 16 characters.");
  const text = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const c = createCipheriv("aes-128-ecb", Buffer.from(hashKey), null);
  return Buffer.concat([c.update(text, "utf8"), c.final()]).toString("base64");
}

/** The browser redirect for a hosted checkout. Pure function so it can be tested without the network. */
export function buildHostedCheckout(
  input: CheckoutInput,
  now = new Date(),
  conf = cfg,
): { url: string; params: Record<string, string> } {
  const params: Record<string, string> = {
    amount: epAmount(input.amountPkr),
    autoRedirect: "1",
    orderRefNum: input.orderRef,
    paymentMethod: "InitialRequest", // VERIFY: your pack may name the methods (MA_PAYMENT_METHOD, CC_PAYMENT_METHOD...)
    postBackURL: input.returnUrl,
    storeId: conf.storeId,
    timeStamp: epTimestamp(now),
  };
  const merchantHashedReq = epHash(params, conf.hashKey);
  return { url: conf.checkoutUrl, params: { ...params, merchantHashedReq } };
}

export const easypaisaPayment: PaymentProvider = {
  name: "easypaisa",
  label: "Easypaisa",

  async createCheckout(input) {
    if (!cfg.storeId || !cfg.hashKey) throw new Error("Easypaisa is not configured: set EASYPAISA_STORE_ID and EASYPAISA_HASH_KEY.");
    const { url, params } = buildHostedCheckout(input);
    const qs = new URLSearchParams(params).toString();
    return { redirect: { url: `${url}?${qs}`, method: "GET" } };
  },

  /** Server-to-server transaction inquiry. We never trust the parameters the customer's browser brings back. */
  async verify(order: OrderInfo): Promise<VerifyResult> {
    if (!cfg.storeId || !cfg.username) throw new Error("Easypaisa inquiry is not configured: set EASYPAISA_STORE_ID, EASYPAISA_USERNAME, EASYPAISA_PASSWORD.");
    const res = await fetch(cfg.inquiryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // VERIFY: header name and encoding ("Credentials": base64(username:password)) come from your pack.
        Credentials: Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64"),
      },
      body: JSON.stringify({ orderId: order.orderRef, storeId: cfg.storeId, accountNum: cfg.accountNum }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Easypaisa inquiry failed (HTTP ${res.status})`);
    const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    // VERIFY: field names and the full list of status values. We only ever accept an explicit PAID.
    const state = String(j.transactionStatus ?? j.status ?? "").toUpperCase();
    const code = String(j.responseCode ?? "");
    const amount = j.transactionAmount != null ? Math.round(Number(j.transactionAmount)) : undefined;
    const raw = JSON.stringify({ code, state }).slice(0, 200);
    if (state === "PAID" && (code === "0000" || code === "")) return { status: "PAID", providerRef: String(j.transactionId ?? ""), amountPkr: amount, raw };
    if (["FAILED", "DECLINED", "REJECTED"].includes(state)) return { status: "FAILED", raw };
    if (["CANCELLED", "CANCELED"].includes(state)) return { status: "CANCELLED", raw };
    return { status: "PENDING", raw };
  },

  async refund() {
    // Easypaisa refunds are processed by the merchant in the merchant portal (VERIFY: or via a reversal API in your pack).
    return "MANUAL_REQUIRED";
  },
};

export const easypaisaIsLive = !cfg.sandbox;
