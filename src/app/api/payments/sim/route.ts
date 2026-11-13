import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const OUTCOMES = { pay: "SIM_PAID", fail: "SIM_FAILED", cancel: "SIM_CANCELLED" } as const;

/** Sandbox simulator only: records what the "customer" chose. settlePayment() then verifies it like a real gateway. */
export async function POST(req: Request) {
  if (env.paymentProvider !== "easypaisa-sim") return NextResponse.json({ error: "Not available." }, { status: 404 });
  const { p, outcome } = (await req.json().catch(() => ({}))) as { p?: string; outcome?: keyof typeof OUTCOMES };
  if (!p || !outcome || !(outcome in OUTCOMES)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const res = await db.payment.updateMany({ where: { id: p, status: "PENDING" }, data: { rawStatus: OUTCOMES[outcome] } });
  return NextResponse.json({ ok: res.count === 1 });
}
