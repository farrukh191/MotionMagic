import { NextResponse } from "next/server";
import { googleEnabled } from "@/features/auth/session";
import { env } from "@/lib/env";
import { getCaps } from "@/services/ai/capabilities";
import { getPaymentProvider } from "@/services/payment";

export const runtime = "nodejs";

/** What the server can do right now (AI quota left, models enabled). The UI uses it to show honest availability and prices. */
export async function GET() {
  try {
    const payLabel = (() => { try { return getPaymentProvider().label; } catch { return "Pay"; } })();
    return NextResponse.json({ caps: await getCaps(), payLabel, payRequired: env.paymentRequired, requireLogin: env.requireLogin, googleEnabled: googleEnabled() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ caps: { text: false, eyes: false, imageEdit: false, motion: false } });
  }
}
