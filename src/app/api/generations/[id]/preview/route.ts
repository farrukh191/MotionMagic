import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { getStorage } from "@/services/storage";

export const runtime = "nodejs";

/** Serves the guest's own uploaded image for preview. Never public. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getOrCreateGuestSession();
  const gen = await db.generation.findUnique({ where: { id: params.id } });
  if (!gen || gen.guestSessionId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (gen.status === "EXPIRED" || gen.originalKey === "pending" || gen.originalKey === "deleted") {
    return NextResponse.json({ error: "File no longer available." }, { status: 410 });
  }
  let data: Buffer;
  try {
    data = await getStorage().get(gen.originalKey);
  } catch {
    return NextResponse.json({ error: "File no longer available." }, { status: 410 });
  }
  return new NextResponse(data, {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=300" },
  });
}
