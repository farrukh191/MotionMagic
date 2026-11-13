import { NextResponse } from "next/server";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { getPersonalTemplate } from "@/features/personalized/meta";
import { createPersonalDraft } from "@/features/personalized/service";
import { getCurrentUser } from "@/features/auth/session";
import { CreateError } from "@/features/generation/create";

export const runtime = "nodejs";

/** JSON: { template: "balloons" | "cake" | "flowers" | "confetti" | "golden", name: "Ayesha" } */
export async function POST(req: Request) {
  const session = await getOrCreateGuestSession();
  const body = (await req.json().catch(() => ({}))) as { template?: string; name?: unknown };
  const template = getPersonalTemplate(String(body.template ?? ""));
  if (!template) return NextResponse.json({ error: "Please choose a template." }, { status: 400 });
  try {
    const d = await createPersonalDraft({ guestSessionId: session.id, userId: (await getCurrentUser())?.id ?? null, template, rawName: body.name });
    return NextResponse.json({ generationId: d.id, template: d.template, name: d.name, price: d.price });
  } catch (e) {
    if (e instanceof CreateError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
