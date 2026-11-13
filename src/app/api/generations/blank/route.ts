import { NextResponse } from "next/server";
import { closedInPersonalizedMode } from "@/lib/mode";
import sharp from "sharp";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { PALETTES, bizDimensions, BIZ_SIZE_IDS, type BizSizeId } from "@/features/business/meta";
import { getEffect } from "@/features/effects/catalog";
import { CreateError, assertUnderDailyLimit, createDraft } from "@/features/generation/create";

export const runtime = "nodejs";

/**
 * "No photo" start for Custom AI Animation: the customer picks a colour and a size and the AI designs on that
 * background. The background is a plain gradient made here, so there is nothing to upload.
 */
export async function POST(req: Request) {
  const closed = closedInPersonalizedMode();
  if (closed) return closed;
  const session = await getOrCreateGuestSession();
  const body = (await req.json().catch(() => ({}))) as { size?: string; palette?: string; text?: string };
  const size = (BIZ_SIZE_IDS.includes(body.size as BizSizeId) && body.size !== "wide" ? body.size : "square") as BizSizeId;
  const palette = PALETTES.find((p) => p.id === body.palette) ?? PALETTES[0];
  const effect = getEffect("ai-custom");
  if (!effect) return NextResponse.json({ error: "Unavailable." }, { status: 500 });
  const { w, h } = bizDimensions(size, 1024);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="g" cx="30%" cy="20%" r="120%"><stop offset="0" stop-color="${palette.bg1}"/><stop offset="1" stop-color="${palette.bg2}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  try {
    await assertUnderDailyLimit(session.id);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const draft = await createDraft({ guestSessionId: session.id, effect, rawOptions: { text: body.text ?? "" }, png, width: w, height: h });
    return NextResponse.json({ generationId: draft.id, effect: draft.effect, price: draft.price, options: draft.options, note: draft.note });
  } catch (e) {
    if (e instanceof CreateError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
