import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { settlePayment } from "@/features/payments/service";
import { getEffect } from "@/features/effects/catalog";

export const runtime = "nodejs";

/**
 * The customer's browser comes back here from the gateway (GET or POST). We IGNORE whatever the browser says
 * about success: we ask the gateway server to server, then send the customer to the right page with a plain result.
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  let id = url.searchParams.get("p");
  if (!id && req.method === "POST") {
    const form = await req.formData().catch(() => null);
    id = form ? String(form.get("p") ?? "") : null;
  }
  const payment = id ? await db.payment.findUnique({ where: { id } }) : null;
  if (!payment) return NextResponse.redirect(new URL("/", env.appUrl), 303);

  const after = (await settlePayment(payment.id)) ?? payment;
  const gen = await db.generation.findUnique({ where: { id: payment.generationId }, select: { id: true, effect: true } });
  const kind = gen ? getEffect(gen.effect)?.kind : undefined;
  const page = kind === "personal" ? "/" : kind === "business" ? "/business" : "/create";
  const result = after.status === "AUTHORIZED" || after.status === "CAPTURED" ? "paid" : after.status === "PENDING" ? "pending" : after.status.toLowerCase();
  return NextResponse.redirect(new URL(`${page}?g=${gen?.id ?? ""}&pay=${result}`, env.appUrl), 303);
}

export const GET = handle;
export const POST = handle;
