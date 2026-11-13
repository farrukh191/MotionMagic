import { NextResponse } from "next/server";
import { closedInPersonalizedMode } from "@/lib/mode";
import { db } from "@/lib/db";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { getStorage } from "@/services/storage";
import { getEffect } from "@/features/effects/catalog";
import { CreateError, assertUnderDailyLimit, createDraft } from "@/features/generation/create";

export const runtime = "nodejs";

/** "Try another effect on this photo": new draft with its own copy of the image. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const closed = closedInPersonalizedMode();
  if (closed) return closed;
  const session = await getOrCreateGuestSession();
  const gen = await db.generation.findUnique({ where: { id: params.id } });
  if (!gen || gen.guestSessionId !== session.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (gen.status === "EXPIRED" || gen.originalKey === "deleted" || gen.originalKey === "pending") {
    return NextResponse.json({ error: "The original photo is no longer available." }, { status: 410 });
  }

  const body = (await req.json().catch(() => ({}))) as { effect?: string };
  const effect = getEffect(body.effect ?? gen.effect);
  if (!effect) return NextResponse.json({ error: "Unknown effect." }, { status: 400 });

  try {
    await assertUnderDailyLimit(session.id);
    const png = await getStorage().get(gen.originalKey);
    const draft = await createDraft({ guestSessionId: session.id, effect, rawOptions: {}, png });
    return NextResponse.json({ generationId: draft.id, effect: draft.effect, price: draft.price, options: draft.options, note: draft.note });
  } catch (e) {
    if (e instanceof CreateError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "The original photo is no longer available." }, { status: 410 });
  }
}
