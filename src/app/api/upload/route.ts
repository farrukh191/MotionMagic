import { NextResponse } from "next/server";
import { closedInPersonalizedMode } from "@/lib/mode";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { getEffect } from "@/features/effects/catalog";
import { CreateError, assertUnderDailyLimit, createDraft } from "@/features/generation/create";
import { ImageValidationError, validateAndNormalizeImage } from "@/features/upload/validate-image";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const closed = closedInPersonalizedMode();
  if (closed) return closed;
  const session = await getOrCreateGuestSession();

  const form = await req.formData();
  const file = form.get("image");
  const effect = getEffect(String(form.get("effect") ?? ""));
  if (!(file instanceof File)) return NextResponse.json({ error: "Please choose an image." }, { status: 400 });
  if (!effect) return NextResponse.json({ error: "Unknown effect." }, { status: 400 });

  let rawOptions: unknown = {};
  try {
    rawOptions = JSON.parse(String(form.get("options") ?? "{}"));
  } catch {
    /* ignore: defaults are used */
  }

  try {
    await assertUnderDailyLimit(session.id);
    const image = await validateAndNormalizeImage(Buffer.from(await file.arrayBuffer()));
    const draft = await createDraft({
      guestSessionId: session.id,
      effect,
      rawOptions,
      png: image.buffer,
      width: image.width,
      height: image.height,
    });
    return NextResponse.json({ generationId: draft.id, effect: draft.effect, price: draft.price, options: draft.options, note: draft.note });
  } catch (e) {
    if (e instanceof ImageValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof CreateError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
