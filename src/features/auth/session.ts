import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { destroySession, userFromToken, type PublicUser } from "./service";

export const SESSION_COOKIE = "mm_session";

export function setSessionCookie(token: string, expiresAt: Date) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  return userFromToken(cookies().get(SESSION_COOKIE)?.value);
}

export async function clearSession() {
  await destroySession(cookies().get(SESSION_COOKIE)?.value);
  cookies().delete(SESSION_COOKIE);
}

/** POSTs must come from our own pages (blocks forged cross-site requests). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; cookies are SameSite=Lax anyway
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

export const googleEnabled = () => Boolean(env.googleClientId && env.googleClientSecret);
