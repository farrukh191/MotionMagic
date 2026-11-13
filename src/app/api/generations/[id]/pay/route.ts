import { NextResponse } from "next/server";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { getCurrentUser } from "@/features/auth/session";
import { PaymentError, startPayment } from "@/features/payments/service";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getOrCreateGuestSession();
  try {
    const user = await getCurrentUser();
    const r = await startPayment(params.id, session.id, user?.id ?? null);
    return NextResponse.json(r); // { status, paymentStatus, redirect?, payLabel }: when redirect is set the browser goes to the gateway
  } catch (e) {
    if (e instanceof PaymentError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
