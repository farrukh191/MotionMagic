"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthForm from "./auth-form";

export function SignInCard({ googleEnabled, notice }: { googleEnabled: boolean; notice?: string }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h1 className="text-2xl font-extrabold">Your MotionMagic account</h1>
      <p className="mt-1 text-sm text-zinc-400">Sign in to download your GIFs and see everything you have made.</p>
      {notice && <p role="status" className="mt-3 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">{notice}</p>}
      <div className="mt-4"><AuthForm googleEnabled={googleEnabled} onDone={() => router.refresh()} /></div>
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
      onClick={async () => { setBusy(true); await fetch("/api/auth/logout", { method: "POST" }).catch(() => null); router.push("/"); router.refresh(); }}>
      {busy ? "…" : "Log out"}
    </button>
  );
}
