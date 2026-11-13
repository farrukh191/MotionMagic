import { NextResponse } from "next/server";
import { closedInPersonalizedMode } from "@/lib/mode";
import { db } from "@/lib/db";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { bizDimensions, bizPrice, getBizTemplate, normalizeBizOptions } from "@/features/business/meta";

export const runtime = "nodejs";

/** Edit an unpaid business draft: text, size, colours, or swap to another look of the same kind (images are kept). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const closed = closedInPersonalizedMode();
  if (closed) return closed;
  const session = await getOrCreateGuestSession();
  const gen = await db.generation.findUnique({ where: { id: params.id } });
  if (!gen || gen.guestSessionId !== session.id || gen.kind !== "business") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (gen.status !== "DRAFT") return NextResponse.json({ error: "This creation can no longer be changed." }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as { template?: string; options?: unknown };
  const current = getBizTemplate(gen.effect);
  const next = body.template ? getBizTemplate(body.template) : current;
  if (!current || !next) return NextResponse.json({ error: "Unknown template." }, { status: 400 });
  if (next.kind !== current.kind) return NextResponse.json({ error: "Pick a look of the same kind." }, { status: 400 });

  const previous = (gen.options ?? {}) as Record<string, unknown>;
  const switching = next.slug !== current.slug;
  const merged = body.options ?? previous;
  const options = normalizeBizOptions(next, switching ? { ...(merged as object), palette: undefined } : merged);
  await db.generation.update({
    where: { id: gen.id },
    data: { effect: next.slug, priceUsd: bizPrice(next), width: bizDimensions(options.size, 480).w, height: bizDimensions(options.size, 480).h, options: { ...options, previewRenders: previous.previewRenders ?? 0 } },
  });
  return NextResponse.json({ template: next.id, price: bizPrice(next), options });
}
