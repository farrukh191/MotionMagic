import { NextResponse } from "next/server";
import { closedInPersonalizedMode } from "@/lib/mode";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { GuestAiLimitError } from "@/features/generation/ai";
import { DesignRequestError, createDesign } from "@/features/generation/design";

export const runtime = "nodejs";

/** Creates the animation design for a Custom AI Animation draft (AI-written, or a free template). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const closed = closedInPersonalizedMode();
  if (closed) return closed;
  const session = await getOrCreateGuestSession();
  const body = (await req.json().catch(() => ({}))) as { prompt?: unknown; template?: unknown };
  try {
    const out = await createDesign({
      generationId: params.id,
      guestSessionId: session.id,
      prompt: typeof body.prompt === "string" ? body.prompt : "",
      template: typeof body.template === "string" ? body.template : undefined,
    });
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof DesignRequestError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof GuestAiLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error("[design] failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not create the design. Please try again." }, { status: 500 });
  }
}
