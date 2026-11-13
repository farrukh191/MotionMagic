import { NextResponse } from "next/server";
import { closedInPersonalizedMode } from "@/lib/mode";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { createDownloadToken } from "@/features/downloads/signed-url";
import { getCaps } from "@/services/ai/capabilities";
import { getEffect, normalizeOptions, resolveEffect } from "@/features/effects/catalog";
import { getBizTemplate, normalizeBizOptions } from "@/features/business/meta";
import { getPersonalTemplate } from "@/features/personalized/meta";
import { paymentInfo, settlePayment } from "@/features/payments/service";

export const runtime = "nodejs";

/** Status polling endpoint used by the progress indicator and for restoring a page after refresh. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getOrCreateGuestSession();
  const gen = await db.generation.findUnique({ where: { id: params.id } });
  if (!gen || gen.guestSessionId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const effect = getEffect(gen.effect);

  // A returning customer whose payment is still unconfirmed: ask the gateway now (refreshing the page = verifying).
  if (gen.status === "DRAFT" && gen.paymentStatus === "PENDING") {
    const waiting = await db.payment.findFirst({ where: { generationId: gen.id, status: "PENDING" }, orderBy: { createdAt: "desc" } });
    if (waiting) {
      await settlePayment(waiting.id).catch(() => null);
      const fresh = await db.generation.findUnique({ where: { id: gen.id } });
      if (fresh) Object.assign(gen, fresh);
    }
  }

  return NextResponse.json({
    id: gen.id,
    payment: await paymentInfo(gen.id),
    status: gen.status,
    paymentStatus: gen.paymentStatus,
    effect: gen.effect,
    personal: effect?.kind === "personal" ? { template: getPersonalTemplate(effect.slug)?.id, name: String(((gen.options ?? {}) as { name?: unknown }).name ?? "") } : null,
    options: effect?.kind === "business" ? normalizeBizOptions(getBizTemplate(effect.slug)!, gen.options) : effect ? normalizeOptions(effect, gen.options) : null,
    business: effect?.kind === "business" ? { template: getBizTemplate(effect.slug)?.id, images: (await db.generatedAsset.findMany({ where: { generationId: gen.id, kind: { startsWith: "input:" } }, select: { kind: true } })).map((a) => a.kind.slice(6)) } : null,
    design: (() => {
      const o = (gen.options ?? {}) as { design?: { title?: string; source?: string; prompt?: string }; designs?: number };
      return o.design ? { title: o.design.title ?? "", source: o.design.source ?? "ai", prompt: o.design.prompt ?? "", remaining: Math.max(0, env.maxDesignsPerGeneration - Number(o.designs ?? 0)) } : null;
    })(),
    aiPreviewReady: Boolean(((gen.options ?? {}) as { eyes?: unknown }).eyes),
    price: Number(gen.priceUsd),
    error: gen.status === "FAILED" ? gen.errorMessage : null,
    downloadUrl: gen.status === "COMPLETED" ? `/api/download/${createDownloadToken(gen.id)}` : null,
  });
}

/** Change the effect and/or options of an unpaid draft (the price follows the effect). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getOrCreateGuestSession();
  const gen = await db.generation.findUnique({ where: { id: params.id } });
  if (!gen || gen.guestSessionId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (gen.status !== "DRAFT") {
    return NextResponse.json({ error: "This creation can no longer be changed." }, { status: 409 });
  }

  const closed = closedInPersonalizedMode();
  if (closed) return closed; // personalized drafts are edited through /api/personalized/[id]
  const body = (await req.json().catch(() => ({}))) as { effect?: string; options?: unknown };
  const effect = getEffect(body.effect ?? gen.effect);
  if (!effect) return NextResponse.json({ error: "Unknown effect." }, { status: 400 });

  const switching = effect.slug !== gen.effect;
  const previous = (gen.options ?? {}) as Record<string, unknown>;
  const options = normalizeOptions(effect, body.options ?? (switching ? {} : previous));
  const resolved = resolveEffect(effect, await getCaps());
  if (!resolved.available) return NextResponse.json({ error: resolved.reason ?? "This effect is unavailable right now." }, { status: 503 });

  // Keep everything the server remembers about this photo: preview cap, AI design + attempts, eye positions.
  const kept = Object.fromEntries(["previewRenders", "design", "designs", "eyes"].filter((k) => k in previous).map((k) => [k, previous[k]]));
  await db.generation.update({
    where: { id: gen.id },
    data: { effect: effect.slug, priceUsd: resolved.priceUsd, options: { ...options, ...kept } },
  });
  return NextResponse.json({ effect: effect.slug, price: resolved.priceUsd, options, note: resolved.note ?? null });
}
