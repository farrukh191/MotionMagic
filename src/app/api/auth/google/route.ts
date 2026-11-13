import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { googleEnabled } from "@/features/auth/session";

export const runtime = "nodejs";

/** Starts "Continue with Google" (OAuth 2.0 authorization-code flow). ?g=<generation id> brings the customer back to their GIF. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!googleEnabled()) return NextResponse.redirect(`${env.appUrl}/account?auth=google-off`);
  const g = (url.searchParams.get("g") ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  const state = randomBytes(16).toString("hex");
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", env.googleClientId);
  auth.searchParams.set("redirect_uri", `${env.appUrl}/api/auth/google/callback`);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid email profile");
  auth.searchParams.set("state", state);
  auth.searchParams.set("prompt", "select_account");
  const res = NextResponse.redirect(auth.toString());
  res.cookies.set("mm_oauth", `${state}.${g}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return res;
}
