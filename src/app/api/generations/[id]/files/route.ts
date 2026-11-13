import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { deleteGenerationFiles } from "@/features/generation/cleanup";

export const runtime = "nodejs";

/** Lets a customer delete their uploaded image and output right away. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getOrCreateGuestSession();
  const gen = await db.generation.findUnique({ where: { id: params.id } });
  if (!gen || gen.guestSessionId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (gen.status === "QUEUED" || gen.status === "PROCESSING") {
    return NextResponse.json({ error: "Wait until processing finishes." }, { status: 409 });
  }
  await deleteGenerationFiles(gen.id);
  await db.generation.update({
    where: { id: gen.id },
    data: { status: "EXPIRED", originalKey: "deleted", outputKey: null },
  });
  return NextResponse.json({ deleted: true });
}
