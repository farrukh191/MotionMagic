import { NextResponse } from "next/server";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { AuthError, claimGuestGenerations, createSession, signUp } from "@/features/auth/service";
import { sameOrigin, setSessionCookie } from "@/features/auth/session";
import { tooManyAttempts } from "@/features/auth/ratelimit";

export const runtime = "nodejs";

/** JSON: { name, email, password } -> creates the account and signs the customer in. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (tooManyAttempts(`signup:${ip}`, 10)) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const user = await signUp(body);
    const guest = await getOrCreateGuestSession();
    await claimGuestGenerations(user.id, guest.id);
    const s = await createSession(user.id);
    setSessionCookie(s.token, s.expiresAt);
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
