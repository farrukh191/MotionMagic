import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ user: await getCurrentUser() }, { headers: { "Cache-Control": "no-store" } });
}
