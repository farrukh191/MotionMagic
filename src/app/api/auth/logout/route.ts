import { NextResponse } from "next/server";
import { clearSession, sameOrigin } from "@/features/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  await clearSession();
  return NextResponse.json({ ok: true });
}
