import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "./password";

export class AuthError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type PublicUser = { id: string; name: string; email: string };
const pub = (u: { id: string; name: string; email: string }): PublicUser => ({ id: u.id, name: u.name, email: u.email });

export const normalizeEmail = (raw: unknown) => String(raw ?? "").trim().toLowerCase();
export const isEmail = (e: string) => e.length <= 254 && /^[^\s@<>()"',;:\\]+@[^\s@<>()"',;:\\]+\.[^\s@<>()"',;:\\]{2,}$/.test(e);
/** Display name: letters (any language), spaces and . ' - only, 1-40 chars. */
export const normalizeUserName = (raw: unknown) =>
  String(raw ?? "").normalize("NFC").replace(/[^\p{L}\p{M}\s.'’-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);
const isUnique = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

export async function signUp(input: { name?: unknown; email?: unknown; password?: unknown }): Promise<PublicUser> {
  const name = normalizeUserName(input.name);
  const email = normalizeEmail(input.email);
  const password = String(input.password ?? "");
  if (!name) throw new AuthError("Please enter your name.");
  if (!isEmail(email)) throw new AuthError("Please enter a valid email address.");
  if (password.length < 8) throw new AuthError("Your password needs at least 8 characters.");
  if (password.length > 72) throw new AuthError("Your password is too long (72 characters at most).");
  const exists = new AuthError("An account with this email already exists. Please log in instead.", 409);
  if (await db.user.findUnique({ where: { email } })) throw exists;
  try {
    return pub(await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } }));
  } catch (e) {
    if (isUnique(e)) throw exists;
    throw e;
  }
}

export async function signIn(input: { email?: unknown; password?: unknown }): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  const user = isEmail(email) ? await db.user.findUnique({ where: { email } }) : null;
  const ok = await verifyPassword(String(input.password ?? "").slice(0, 200), user?.passwordHash ?? null);
  if (!user || !ok) throw new AuthError("Wrong email or password. (Signed up with Google? Use “Continue with Google”.)", 401);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return pub(user);
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** New login session. The browser gets the random token; the database only keeps its hash. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.sessionDays * 86_400_000);
  await db.authSession.create({ data: { id: tokenHash(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function userFromToken(token: string | undefined | null): Promise<PublicUser | null> {
  if (!token || token.length > 100) return null;
  const s = await db.authSession.findUnique({ where: { id: tokenHash(token) } });
  if (!s || s.expiresAt.getTime() < Date.now()) return null;
  const u = await db.user.findUnique({ where: { id: s.userId } });
  return u ? pub(u) : null;
}

export async function destroySession(token: string | undefined | null) {
  if (token) await db.authSession.deleteMany({ where: { id: tokenHash(token) } });
}

/** Google sign-in. Only a Google-verified email may be matched to an existing account. */
export async function signInWithGoogle(g: { sub: string; email: string; emailVerified: boolean; name: string }): Promise<PublicUser> {
  const email = normalizeEmail(g.email);
  if (!g.sub || !isEmail(email) || !g.emailVerified) throw new AuthError("Google did not confirm your email address.", 403);
  const byGoogle = await db.user.findUnique({ where: { googleId: g.sub } });
  if (byGoogle) {
    await db.user.update({ where: { id: byGoogle.id }, data: { lastLoginAt: new Date() } });
    return pub(byGoogle);
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // The password account's email was never verified, so anyone could have registered it first. Linking Google proves the
    // real owner: drop the old password and every old login session, so a pre-registered attacker is locked out.
    await db.authSession.deleteMany({ where: { userId: existing.id } });
    await db.user.update({ where: { id: existing.id }, data: { googleId: g.sub, emailVerified: true, passwordHash: null, lastLoginAt: new Date() } });
    return pub(existing);
  }
  const name = normalizeUserName(g.name) || email.split("@")[0].slice(0, 40);
  return pub(await db.user.create({ data: { name, email, googleId: g.sub, emailVerified: true, passwordHash: null } }));
}

/** After logging in, the GIFs this browser made as a guest become the customer's. */
export async function claimGuestGenerations(userId: string, guestSessionId: string | null) {
  if (!guestSessionId) return;
  await db.generation.updateMany({
    where: { guestSessionId, userId: null, kind: "personal" },
    data: { userId, expiresAt: new Date(Date.now() + env.accountRetentionDays * 86_400_000) },
  });
}
