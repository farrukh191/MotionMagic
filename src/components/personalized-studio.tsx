"use client";

import { useEffect, useRef, useState } from "react";
import { PERSONAL_CATEGORIES, PERSONAL_PRICE_USD, NAME_MAX, getPersonalTemplate, isValidName, normalizeName, templatesIn, type PersonalTemplate } from "@/features/personalized/meta";
import { buildPersonalDocument } from "@/features/personalized/build";
import { formatPrice } from "@/features/effects/catalog";
import AuthForm, { type AuthUser } from "@/components/auth-form";
import { goToGateway, payResultMessage, type GatewayRedirect } from "@/lib/gateway-redirect";

type Status = { status: "DRAFT" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED"; error: string | null; downloadUrl: string | null };
type Draft = { id: string; template: string; name: string };
type Info = Status & { payment?: { pending?: boolean } | null; personal?: { template: string; name: string } | null };

const primary = "rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-fuchsia-900/30 hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-full border border-white/25 px-5 py-3.5 text-base font-semibold hover:bg-white/10 active:scale-[.98] disabled:opacity-50";

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, init);
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

/** Live animated scene, drawn by the browser from HTML/CSS. Nothing is generated or stored on the server. */
function Live({ template, name, label }: { template: string; name: string; label: string }) {
  return (
    <iframe
      title={label}
      sandbox=""
      scrolling="no"
      loading="lazy"
      srcDoc={buildPersonalDocument(template, name, "fluid")}
      className="pointer-events-none absolute inset-0 h-full w-full border-0 bg-black"
    />
  );
}

export default function PersonalizedStudio({ initialGenerationId }: { initialGenerationId: string | null }) {
  const [cat, setCat] = useState(PERSONAL_CATEGORIES[0].id);
  const [sel, setSel] = useState<PersonalTemplate | null>(null);
  const [name, setName] = useState("");
  const [shownName, setShownName] = useState(""); // what the live preview shows
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payNote, setPayNote] = useState<string | null>(null);
  const [payPending, setPayPending] = useState(false);
  const [payLabel, setPayLabel] = useState("");
  const [payRequired, setPayRequired] = useState(true);
  const [requireLogin, setRequireLogin] = useState(true);
  const [googleOn, setGoogleOn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(initialGenerationId));
  const input = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);

  const done = status?.status === "COMPLETED" && Boolean(status.downloadUrl);
  const clean = normalizeName(name);
  const valid = isValidName(clean);
  const price = formatPrice(PERSONAL_PRICE_USD);
  const category = PERSONAL_CATEGORIES.find((c) => c.id === cat) ?? PERSONAL_CATEGORIES[0];
  const templates = templatesIn(cat);

  const syncUrl = (id: string | null) => {
    try {
      const u = new URL(window.location.href);
      if (id) u.searchParams.set("g", id); else { u.searchParams.delete("g"); u.searchParams.delete("pay"); }
      window.history.replaceState(null, "", u.toString());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => setUser(j.user ?? null)).catch(() => null);
  }, []);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((j) => { setPayLabel(j.payLabel ?? ""); setPayRequired(j.payRequired !== false); setRequireLogin(j.requireLogin !== false); setGoogleOn(Boolean(j.googleEnabled)); }).catch(() => null);
  }, []);

  // Restore after a refresh or after returning from Easypaisa.
  useEffect(() => {
    if (!initialGenerationId) return;
    api<Info>(`/api/generations/${initialGenerationId}`)
      .then(({ ok, data }) => {
        if (!ok || !data.personal || data.status === "EXPIRED") return syncUrl(null);
        const t = getPersonalTemplate(data.personal.template ?? "");
        if (!t) return syncUrl(null);
        setSel(t); setCat(t.category); setName(data.personal.name); setShownName(data.personal.name);
        setDraft({ id: initialGenerationId, template: t.id, name: data.personal.name });
        setStatus({ status: data.status, error: data.error, downloadUrl: data.downloadUrl });
        const note = payResultMessage(new URLSearchParams(window.location.search).get("pay"));
        if (new URLSearchParams(window.location.search).get("signed") && data.status === "DRAFT") setPayNote("You are signed in. Press Download to continue.");
        else if (note && data.status === "DRAFT") setPayNote(note.text);
        setPayPending(Boolean(data.payment?.pending));
      })
      .finally(() => setRestoring(false));
  }, [initialGenerationId]);

  // While a payment is being confirmed, ask the server (which checks with the gateway) until it is decided.
  useEffect(() => {
    if (!draft || !payPending) return;
    const t = setInterval(async () => {
      const { ok, data } = await api<Info>(`/api/generations/${draft.id}`).catch(() => ({ ok: false, data: {} as Info }));
      if (!ok) return;
      setStatus({ status: data.status, error: data.error, downloadUrl: data.downloadUrl });
      setPayPending(Boolean(data.payment?.pending));
      if (data.payment && !data.payment.pending) setPayNote(null);
    }, 1500);
    return () => clearInterval(t);
  }, [draft, payPending]);

  function choose(t: PersonalTemplate) {
    setSel(t);
    setError(null);
    setTimeout(() => input.current?.focus(), 80);
  }

  // Generate = show the live preview with the typed name. Purely in the browser.
  function generate() {
    if (!sel || !valid) return setError("Please type a name using letters only.");
    setError(null);
    setShownName(clean);
    setTimeout(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function changeName() {
    setError(null);
    input.current?.focus();
    input.current?.select();
    input.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Download: save the choice (template + name only), then open the payment screen.
  async function download() {
    if (!sel || !shownName) return;
    setSaving(true); setError(null);
    try {
      let newId = "";
      if (!draft) {
        const { ok, data } = await api<{ generationId: string }>("/api/personalized", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: sel.id, name: shownName }) });
        if (!ok) return setError(data.error ?? "Could not start. Please try again.");
        newId = data.generationId;
        setDraft({ id: data.generationId, template: sel.id, name: shownName });
        setStatus({ status: "DRAFT", error: null, downloadUrl: null });
        syncUrl(data.generationId);
      } else if (draft.template !== sel.id || draft.name !== shownName) {
        const { ok, data } = await api<unknown>(`/api/personalized/${draft.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: shownName, template: sel.id }) });
        if (!ok) return setError((data as { error?: string }).error ?? "Could not update the name.");
        setDraft({ id: draft.id, template: sel.id, name: shownName });
      }
      const id = draft?.id ?? newId;
      if (requireLogin && !user) setAuthOpen(true); // sign up / log in first, then continue
      else await proceed(id);
    } catch {
      setError("Network problem. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  // Signed in: continue with payment, or unlock directly when payment is switched off.
  async function proceed(id: string) {
    if (payRequired) setPayOpen(true);
    else await unlockFree(id);
  }

  async function signedIn(u: AuthUser) {
    setUser(u);
    setAuthOpen(false);
    if (draft) await proceed(draft.id);
  }

  // Free mode: the server unlocks the GIF directly (no payment screen).
  async function unlockFree(id: string) {
    const res = await api<unknown>(`/api/generations/${id}/pay`, { method: "POST" });
    if (!res.ok) return setError((res.data as { error?: string }).error ?? "Could not unlock your GIF. Please try again.");
    const s = await api<Info>(`/api/generations/${id}`);
    if (s.ok) setStatus({ status: s.data.status, error: s.data.error, downloadUrl: s.data.downloadUrl });
  }

  async function pay() {
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      const res = await api<{ redirect?: GatewayRedirect }>(`/api/generations/${draft.id}/pay`, { method: "POST" });
      if (!res.ok) { setPayOpen(false); return setError(res.data.error ?? "Payment could not be started. You have not been charged."); }
      if (res.data.redirect) {
        setPayNote("Taking you to Easypaisa…");
        goToGateway(res.data.redirect);
        return; // the page leaves; keep the button disabled
      }
      const s = await api<Info>(`/api/generations/${draft.id}`);
      if (s.ok) setStatus({ status: s.data.status, error: s.data.error, downloadUrl: s.data.downloadUrl });
      setPayOpen(false);
    } catch {
      setError("Network problem. You have not been charged.");
    }
    setBusy(false);
  }

  // Paid: the GIF is drawn right now on the server, sent straight to the browser and saved. Nothing is kept on the server.
  async function saveGif() {
    if (!status?.downloadUrl) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(status.downloadUrl);
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Could not create your GIF. Please try again.");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(sel?.greeting ?? "gif").toLowerCase().replace(/\s+/g, "-")}-${shownName.toLowerCase().replace(/\s+/g, "-")}.gif`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create your GIF. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function again() {
    setDraft(null); setSel(null); setName(""); setStatus(null); setError(null); setShownName(""); setPayNote(null); setPayPending(false);
    syncUrl(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (restoring) return <p className="py-16 text-center text-zinc-400">Loading your GIF…</p>;

  /* ---------- paid: ready to download ---------- */
  if (done && draft && sel) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-5 text-center sm:p-6">
        <h2 className="text-2xl font-extrabold">{payRequired ? "🎉 Payment received" : "🎉 Your GIF is ready"}</h2>
        <div className="relative mx-auto mt-4 aspect-square w-full overflow-hidden rounded-2xl bg-black"><Live template={sel.id} name={shownName} label={`${sel.greeting} ${shownName}`} /></div>
        <button className={`${primary} mt-5 w-full`} onClick={saveGif} disabled={busy}>{busy ? "Preparing your GIF…" : "⬇️ Download GIF"}</button>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button className={`${secondary} mt-3 w-full`} onClick={again} disabled={busy}>Make another one</button>
        <p className="mt-3 text-xs text-zinc-500">Your GIF is created fresh when you press Download (a few seconds). Share it on WhatsApp, Instagram or anywhere.</p>
      </div>
    );
  }

  const showPreview = Boolean(sel && shownName);

  return (
    <div className="space-y-8">
      <div ref={top} />
      {/* ---------- live preview ---------- */}
      {showPreview && sel && (
        <section aria-labelledby="pv" className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h2 id="pv" className="text-center text-lg font-extrabold">{sel.greeting} {shownName}!</h2>
          <div className="relative mx-auto mt-3 aspect-square w-full overflow-hidden rounded-2xl bg-black">
            <Live template={sel.id} name={shownName} label={`Preview: ${sel.greeting} ${shownName}`} />
          </div>
          {payNote && <p role="status" className="mt-3 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">{payNote}</p>}
          {error && !payOpen && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className={secondary} onClick={changeName} disabled={busy || saving}>✏️ Change name</button>
            <button className={primary} onClick={download} disabled={busy || saving || payPending}>{saving ? "One moment…" : "⬇️ Download"}</button>
          </div>
          <p className="mt-2 text-center text-xs text-zinc-400">{payRequired ? `Download ${price} · pay with Easypaisa` : "Download is free"}</p>
        </section>
      )}

      {/* ---------- categories ---------- */}
      <section aria-labelledby="ct">
        <h2 id="ct" className="text-center text-2xl font-extrabold">{showPreview ? "Or try another design" : "1. Pick a category"}</h2>
        <div role="tablist" aria-label="Categories" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:flex-wrap sm:justify-center">
          {PERSONAL_CATEGORIES.map((c) => {
            const on = c.id === cat;
            const n = templatesIn(c.id).length;
            return (
              <button key={c.id} role="tab" aria-selected={on} onClick={() => setCat(c.id)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-[.97] ${on ? "border-fuchsia-400 bg-fuchsia-500/20 text-white" : "border-white/15 bg-white/5 text-zinc-300 hover:border-white/30"}`}>
                {c.emoji} {c.label}{n === 0 && <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">soon</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-sm text-zinc-400">{category.blurb}</p>

        {templates.length === 0 ? (
          <div className="mx-auto mt-4 max-w-md rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
            <p className="text-4xl" aria-hidden>{category.emoji}</p>
            <p className="mt-2 text-lg font-bold">{category.label} designs are coming soon</p>
            <p className="mt-1 text-sm text-zinc-400">We are creating them right now. Try the Birthday designs in the meantime.</p>
            <button className={`${secondary} mt-4`} onClick={() => setCat(PERSONAL_CATEGORIES[0].id)}>See Birthday designs</button>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {templates.map((t) => {
              const on = sel?.id === t.id;
              return (
                <li key={t.id}>
                  <button onClick={() => choose(t)} aria-pressed={on} disabled={busy || saving}
                    className={`group block w-full overflow-hidden rounded-2xl border bg-white/5 text-left transition active:scale-[.98] ${on ? "border-fuchsia-400 ring-2 ring-fuchsia-400/50" : "border-white/10 hover:border-white/30"}`}>
                    <div className="relative aspect-square w-full bg-black"><Live template={t.id} name="Ayesha" label={`${t.name} example`} /></div>
                    <div className="p-3">
                      <p className="text-sm font-bold">{t.emoji} {t.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{t.tagline}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- name ---------- */}
      {sel && (
        <section aria-labelledby="nm" className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <h2 id="nm" className="text-lg font-extrabold">2. Type the name</h2>
          <p className="mt-1 text-sm text-zinc-400">Your GIF will say “{sel.greeting} <b className="text-white">{clean || "…"}</b>!” in the <b className="text-white">{sel.name}</b> design.</p>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-zinc-300">Name</span>
            <input ref={input} value={name} maxLength={NAME_MAX} autoComplete="off" enterKeyHint="go" placeholder="Ayesha"
              onChange={(e) => { setName(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && valid) generate(); }}
              className="mt-1 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3.5 text-lg outline-none focus:border-fuchsia-400" />
          </label>
          <p className="mt-1 text-xs text-zinc-500">Letters only, up to {NAME_MAX} characters.</p>
          {error && !showPreview && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <button className={`${primary} mt-4 w-full`} disabled={!valid} onClick={generate}>{showPreview ? "Update my GIF" : "Generate my GIF"}</button>
        </section>
      )}

      {/* ---------- sign up / log in (only when pressing Download while signed out) ---------- */}
      {authOpen && draft && (
        <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-black/70 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="auth-h" onClick={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}>
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-[#14141f] p-6 sm:rounded-3xl">
            <h2 id="auth-h" className="text-xl font-extrabold">Create a free account to download</h2>
            <p className="mt-1 mb-4 text-sm text-zinc-400">Your design and name are saved. After signing in you will download your GIF and see all your GIFs in your account.</p>
            <AuthForm googleEnabled={googleOn} generationId={draft.id} submitLabel="Continue" onDone={signedIn} />
            <button className={`${secondary} mt-3 w-full`} onClick={() => setAuthOpen(false)}>Not now</button>
          </div>
        </div>
      )}

      {/* ---------- payment screen ---------- */}
      {payOpen && draft && sel && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="pay-h" onClick={(e) => { if (e.target === e.currentTarget && !busy) setPayOpen(false); }}>
          <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#14141f] p-6 sm:rounded-3xl">
            <h2 id="pay-h" className="text-xl font-extrabold">Complete your payment</h2>
            <dl className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 text-sm">
              <div className="flex justify-between gap-4 p-3"><dt className="text-zinc-400">GIF</dt><dd className="text-right font-medium">{sel.greeting} {draft.name}!</dd></div>
              <div className="flex justify-between gap-4 p-3"><dt className="text-zinc-400">Design</dt><dd className="text-right">{sel.emoji} {sel.name}</dd></div>
              <div className="flex justify-between gap-4 p-3"><dt className="text-zinc-400">Total</dt><dd className="text-lg font-extrabold">{price}</dd></div>
            </dl>
            <button className={`${primary} mt-5 flex w-full items-center justify-center gap-2`} onClick={pay} disabled={busy}>
              {busy ? "Please wait…" : <>Pay {price} with Easypaisa</>}
            </button>
            <button className={`${secondary} mt-2 w-full`} onClick={() => setPayOpen(false)} disabled={busy}>Not now</button>
            <ul className="mt-4 space-y-1 text-xs text-zinc-400">
              <li>🔒 You will pay on Easypaisa&apos;s own secure page.</li>
              <li>🚫 MotionMagic never asks for your Easypaisa PIN or OTP. Never type them anywhere except Easypaisa&apos;s official page.</li>
              <li>✅ Your GIF unlocks only after Easypaisa confirms the payment. If we cannot deliver it, you are refunded.</li>
              {payLabel && /test|simulator/i.test(payLabel) && <li className="text-amber-300">Test mode: {payLabel}. No real money moves.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
