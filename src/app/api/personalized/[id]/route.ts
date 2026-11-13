import { NextResponse } from "next/server";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { updatePersonalDraft } from "@/features/personalized/service";
import { CreateError } from "@/features/generation/create";

export const runtime = "nodejs";

/** Change Name: { name, template? } */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getOrCreateGuestSession();
  const body = (await req.json().catch(() => ({}))) as { name?: unknown; template?: string };
  try {
    return NextResponse.json(await updatePersonalDraft(params.id, session.id, body));
  } catch (e) {
    if (e instanceof CreateError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
