import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** Bearer-token check for /api/admin/*. Disabled (always false) when ADMIN_TOKEN is not set. */
export function isAdmin(req: Request): boolean {
  if (!env.adminToken || env.adminToken.length < 16) return false;
  const got = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const want = Buffer.from(env.adminToken);
  return got.length === want.length && timingSafeEqual(got, want);
}
