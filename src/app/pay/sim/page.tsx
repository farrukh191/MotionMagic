"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function Sim() {
  const q = useSearchParams();
  const p = q.get("p") ?? "";
  const r = q.get("r") ?? "";
  const [busy, setBusy] = useState(false);
  // Only ever return to our own return route.
  const safe = r.includes("/api/payments/return") ? r : "/";

  async function choose(outcome: "pay" | "fail" | "cancel") {
    setBusy(true);
    await fetch("/api/payments/sim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ p, outcome }) });
    window.location.href = safe;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">SANDBOX SIMULATOR · no real money</p>
      <h1 className="mt-4 text-2xl font-extrabold">Easypaisa (simulated)</h1>
      <p className="mt-2 text-zinc-400">This page stands in for the real Easypaisa checkout so you can test every outcome.</p>
      <div className="mt-6 grid gap-3">
        <button disabled={busy} onClick={() => choose("pay")} className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-black disabled:opacity-50">Pay successfully</button>
        <button disabled={busy} onClick={() => choose("fail")} className="rounded-full bg-red-500/80 px-6 py-3 font-semibold disabled:opacity-50">Payment fails</button>
        <button disabled={busy} onClick={() => choose("cancel")} className="rounded-full border border-white/20 px-6 py-3 font-semibold disabled:opacity-50">Cancel and go back</button>
      </div>
    </main>
  );
}

export default function SimPage() {
  return <Suspense fallback={null}><Sim /></Suspense>;
}
