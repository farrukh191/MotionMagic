import { NextResponse } from "next/server";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { PreviewError, getPreviewGif } from "@/features/generation/preview";

export const runtime = "nodejs";

/**
 * Free watermarked preview GIF of the draft's current effect and options.
 * ?run=1 means "yes, spend a little free AI quota to create my AI preview". Without it, AI effects answer 202.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getOrCreateGuestSession();
  const runAi = new URL(req.url).searchParams.get("run") === "1";
  try {
    const gif = await getPreviewGif(params.id, session.id, runAi);
    return new NextResponse(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "private, max-age=600" } });
  } catch (e) {
    if (e instanceof PreviewError) {
      return NextResponse.json({ error: e.message, needsAi: e.needsAi }, { status: e.status });
    }
    console.error("[preview] failed", e);
    return NextResponse.json({ error: "Could not create a preview. Please try again." }, { status: 500 });
  }
}
