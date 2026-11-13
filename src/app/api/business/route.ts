import { NextResponse } from "next/server";
import { closedInPersonalizedMode } from "@/lib/mode";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { getBizTemplate } from "@/features/business/meta";
import { createBusinessDraft } from "@/features/business/service";
import { CreateError } from "@/features/generation/create";

export const runtime = "nodejs";

/** Multipart: template, options (JSON: size, palette, panel, fields), and one file per image slot (product, logo, image1..4). */
export async function POST(req: Request) {
  const closed = closedInPersonalizedMode();
  if (closed) return closed;
  const session = await getOrCreateGuestSession();
  const form = await req.formData();
  const template = getBizTemplate(String(form.get("template") ?? ""));
  if (!template) return NextResponse.json({ error: "Unknown template." }, { status: 400 });
  let rawOptions: unknown = {};
  try {
    rawOptions = JSON.parse(String(form.get("options") ?? "{}"));
  } catch {
    /* defaults are used */
  }
  const files: Record<string, File> = {};
  for (const [k, v] of form.entries()) if (v instanceof File && v.size > 0) files[k] = v;
  try {
    const d = await createBusinessDraft({ guestSessionId: session.id, template, rawOptions, files });
    return NextResponse.json({ generationId: d.id, template: template.id, price: d.price, options: d.options, images: d.images });
  } catch (e) {
    if (e instanceof CreateError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
