import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { buildReport, refundsDue } from "@/features/payments/report";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  return NextResponse.json({ report: await buildReport(days), refunds: await refundsDue() }, { headers: { "Cache-Control": "no-store" } });
}
