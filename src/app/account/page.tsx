import Link from "next/link";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser, googleEnabled } from "@/features/auth/session";
import { createDownloadToken } from "@/features/downloads/signed-url";
import { getPersonalTemplate } from "@/features/personalized/meta";
import { LogoutButton, SignInCard } from "@/components/account-client";
import DownloadButton from "@/components/download-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "My GIFs · MotionMagic" };

const NOTICES: Record<string, string> = {
  failed: "Google sign-in did not work. Please try again or use your email.",
  unverified: "Google could not confirm your email address, so we could not sign you in.",
  "google-off": "Google sign-in is not set up on this site yet. Please use your email.",
};

export default async function Account({ searchParams }: { searchParams: { auth?: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return <main className="mx-auto max-w-6xl px-4 py-10"><SignInCard googleEnabled={googleEnabled()} notice={NOTICES[searchParams.auth ?? ""]} /></main>;
  }

  const gens = await db.generation.findMany({ where: { userId: user.id, kind: "personal" }, orderBy: { createdAt: "desc" }, take: 100 });
  const ready = gens.filter((g) => g.status === "COMPLETED");
  const open = gens.filter((g) => g.status === "DRAFT").length;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Hello, {user.name} 👋</h1>
          <p className="text-sm text-zinc-400">{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><dt className="text-sm text-zinc-400">GIFs created</dt><dd className="mt-1 text-3xl font-extrabold">{ready.length}</dd></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><dt className="text-sm text-zinc-400">Not downloaded yet</dt><dd className="mt-1 text-3xl font-extrabold">{open}</dd></div>
      </dl>

      <Link href="/" className="mt-5 inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-900/30 hover:brightness-110">✨ Make a new GIF</Link>

      <h2 className="mt-8 text-lg font-extrabold">Your GIFs</h2>
      {gens.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-white/20 p-6 text-center text-zinc-400">You have not made a GIF yet. Pick a design and type a name to start.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {gens.map((g) => {
            const t = getPersonalTemplate(g.effect);
            const name = String(((g.options ?? {}) as { name?: unknown }).name ?? "");
            const isReady = g.status === "COMPLETED";
            return (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="font-bold">{t?.greeting ?? "GIF"} {name}!</p>
                  <p className="text-sm text-zinc-400">{t ? `${t.emoji} ${t.name}` : g.effect} · {g.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {isReady ? (g.paymentStatus === "NONE" ? "Free" : "Paid") : g.status === "DRAFT" ? "Not downloaded yet" : g.status.toLowerCase()}</p>
                </div>
                {isReady ? (
                  <DownloadButton href={`/api/download/${createDownloadToken(g.id)}`} filename={`${(t?.greeting ?? "gif").toLowerCase().replace(/\s+/g, "-")}-${name.toLowerCase().replace(/\s+/g, "-")}.gif`} />
                ) : g.status === "DRAFT" ? (
                  <Link href={`/?g=${g.id}`} className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white/10">Continue</Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-xs text-zinc-500">We keep only the design and the name, never the GIF file. Your GIF is created fresh each time you press Download. History is kept for {env.accountRetentionDays} days.</p>
    </main>
  );
}
