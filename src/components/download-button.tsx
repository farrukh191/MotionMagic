"use client";

import { useState } from "react";

/** The GIF is drawn when pressed (nothing is stored), so show a short "Preparing…" state. */
export default function DownloadButton({ href, filename }: { href: string; filename: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true); setError(null);
    try {
      const r = await fetch(href);
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Could not create your GIF. Please try again.");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create your GIF.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button onClick={go} disabled={busy} className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">{busy ? "Preparing…" : "⬇️ Download"}</button>
      {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
