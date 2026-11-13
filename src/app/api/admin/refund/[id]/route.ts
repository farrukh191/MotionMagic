import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { markRefunded } from "@/features/payments/service";

export const runtime = "nodejs";

/** After refunding in the Easypaisa merchant portal, mark it done here. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: await markRefunded(params.id) });
}
