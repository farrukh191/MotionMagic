import { NextResponse } from "next/server";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { AuthError, claimGuestGenerations, createSession, normalizeEmail, signIn } from "@/features/auth/service";
import { sameOrigin, setSessionCookie } from "@/features/auth/session";
import { tooManyAttempts } from "@/features/auth/ratelimit";

export const runtime = "nodejs";

/** JSON: { email, password } */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (tooManyAttempts(`login:${ip}:${normalizeEmail(body.email)}`) || tooManyAttempts(`loginip:${ip}`, 40)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }
  try {
    const user = await signIn(body);
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
