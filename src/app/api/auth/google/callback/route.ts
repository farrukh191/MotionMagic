import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getOrCreateGuestSession } from "@/lib/guest-session";
import { claimGuestGenerations, createSession, signInWithGoogle, AuthError } from "@/features/auth/service";
import { googleEnabled } from "@/features/auth/session";

export const runtime = "nodejs";

function back(path: string) {
  const res = NextResponse.redirect(`${env.appUrl}${path}`);
  res.cookies.delete("mm_oauth");
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookie = req.headers.get("cookie")?.split(";").map((c) => c.trim()).find((c) => c.startsWith("mm_oauth="))?.slice(9) ?? "";
  const [state, g = ""] = cookie.split(".");
  const code = url.searchParams.get("code");
  if (!googleEnabled() || !code || !state || url.searchParams.get("state") !== state) return back("/account?auth=failed");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.googleClientId, client_secret: env.googleClientSecret, redirect_uri: `${env.appUrl}/api/auth/google/callback`, grant_type: "authorization_code" }),
    });
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokenRes.ok || !tokens.access_token) return back("/account?auth=failed");
    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!infoRes.ok) return back("/account?auth=failed");

    const user = await signInWithGoogle({ sub: info.sub ?? "", email: info.email ?? "", emailVerified: info.email_verified === true, name: info.name ?? "" });
    const guest = await getOrCreateGuestSession();
    await claimGuestGenerations(user.id, guest.id);
    const s = await createSession(user.id);
    const res = back(g ? `/?g=${g}&signed=1` : "/account");
    res.cookies.set("mm_session", s.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: s.expiresAt, path: "/" });
    return res;
  } catch (e) {
    console.error("[auth] google sign-in failed", e instanceof Error ? e.message : e);
    return back(e instanceof AuthError ? "/account?auth=unverified" : "/account?auth=failed");
  }
}
