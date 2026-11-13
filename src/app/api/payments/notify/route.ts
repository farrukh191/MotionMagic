import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settlePayment } from "@/features/payments/service";

export const runtime = "nodejs";

/**
 * Server-to-server notification from the gateway (if your Easypaisa pack provides one; field name may differ: VERIFY).
 * The body is only used to FIND the order. What happened is always confirmed by asking the gateway ourselves.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(async () => Object.fromEntries((await req.formData().catch(() => new FormData())).entries()));
  const ref = String((body as Record<string, unknown>).orderRefNumber ?? (body as Record<string, unknown>).orderRefNum ?? (body as Record<string, unknown>).orderId ?? (body as Record<string, unknown>).orderRef ?? "");
  if (!ref) return NextResponse.json({ ok: false }, { status: 400 });
  const payment = await db.payment.findUnique({ where: { providerOrderId: ref } });
  if (payment) await settlePayment(payment.id).catch((e) => console.error("[payments] notify settle failed", e));
  return NextResponse.json({ ok: true }); // always 200 so the gateway stops retrying; unknown refs are simply ignored
}
