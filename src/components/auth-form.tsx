"use client";

import { useState } from "react";

export type AuthUser = { id: string; name: string; email: string };

const primary = "rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-fuchsia-900/30 hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50";
const field = "mt-1 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3.5 text-base outline-none focus:border-fuchsia-400";

/** Sign up / log in with email + password, or Google. Used in the Download popup and on the account page. */
export default function AuthForm({ googleEnabled, generationId, submitLabel, onDone }: { googleEnabled: boolean; generationId?: string | null; submitLabel?: string; onDone: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { name, email, password } : { email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { user?: AuthUser; error?: string };
      if (!res.ok || !data.user) return setError(data.error ?? "Something went wrong. Please try again.");
      onDone(data.user);
    } catch {
      setError("Network problem. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const label = submitLabel ?? (mode === "signup" ? "Create account" : "Log in");

  return (
    <div>
      <div role="tablist" className="grid grid-cols-2 rounded-full border border-white/15 p-1 text-sm font-semibold">
        {(["signup", "login"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }}
            className={`rounded-full py-2 ${mode === m ? "bg-white/15 text-white" : "text-zinc-400"}`}>{m === "signup" ? "Sign up" : "Log in"}</button>
        ))}
      </div>

      {googleEnabled && (
        <>
          <a href={`/api/auth/google${generationId ? `?g=${encodeURIComponent(generationId)}` : ""}`}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3.5 text-base font-semibold text-zinc-900 hover:bg-zinc-100 active:scale-[.98]">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
            Continue with Google
          </a>
          <p className="my-3 text-center text-xs text-zinc-500">or use your email</p>
        </>
      )}

      <form onSubmit={submit} className={googleEnabled ? "" : "mt-4"}>
        {mode === "signup" && (
          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Your name</span>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={40} required placeholder="Ayesha Khan" />
          </label>
        )}
        <label className="mt-3 block">
          <span className="text-sm font-medium text-zinc-300">Email</span>
          <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required placeholder="you@gmail.com" />
        </label>
        <label className="mt-3 block">
          <span className="text-sm font-medium text-zinc-300">Password</span>
          <input className={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} maxLength={72} required placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} />
        </label>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button className={`${primary} mt-4 w-full`} disabled={busy}>{busy ? "Please wait…" : label}</button>
      </form>
    </div>
  );
}
