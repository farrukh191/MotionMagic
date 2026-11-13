import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sign, verifySignature } from "@/lib/signing";

const COOKIE = "mm_guest";
const MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Returns the current guest session, creating one on first visit.
 * The cookie holds "<id>.<hmac>" so the id cannot be forged or guessed.
 */
export async function getOrCreateGuestSession() {
  const jar = cookies();
  const raw = jar.get(COOKIE)?.value;

  if (raw) {
    const [id, sig] = raw.split(".");
    if (id && sig && verifySignature(id, sig, env.sessionSecret)) {
      const existing = await db.guestSession.findUnique({ where: { id } });
      if (existing) {
        await db.guestSession.update({ where: { id }, data: { lastSeenAt: new Date() } });
        return existing;
      }
    }
  }

  const created = await db.guestSession.create({ data: {} });
  jar.set(COOKIE, `${created.id}.${sign(created.id, env.sessionSecret)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
  return created;
}
