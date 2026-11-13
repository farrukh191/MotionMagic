"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PALETTES } from "@/features/business/meta";
import { goToGateway, payResultMessage } from "@/lib/gateway-redirect";
import {
  EFFECT_LIST,
  EFFECTS,
  MOTION_STYLES,
  TEMPLATES,
  formatPrice,
  resolveEffect,
  type Caps,
  type EffectDef,
  type EffectOptions,
  type Level,
  type Resolved,
} from "@/features/effects/catalog";
import { PriceTag } from "@/components/effect-card";

type Draft = { id: string; effect: string; price: number; options: EffectOptions };
type Status = {
  status: "DRAFT" | "AWAITING_PAYMENT" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";
  error: string | null;
  downloadUrl: string | null;
};

const MAX_MB = 10;
const ALL_CAPS: Caps = { text: true, eyes: true, imageEdit: true, motion: true }; // until /api/status answers

/** Phone photos are huge (and sometimes HEIC). Decode in the browser, fix rotation, shrink to 2048px, send a small JPEG. */
async function prepareImage(file: File, maxBytes: number): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  for (const q of [0.9, 0.8, 0.7]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= maxBytes) return new File([blob], "photo.jpg", { type: "image/jpeg" });
  }
  throw new Error("too large");
}
const LEVELS: { value: Level; label: string }[] = [
  { value: "low", label: "Subtle" },
  { value: "medium", label: "Balanced" },
  { value: "high", label: "Wild" },
];

const defaultOptions = (e: EffectDef): EffectOptions => ({ text: "", theme: e.defaultTheme, intensity: "medium", nudge: { x: 0, y: 0 } });

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function expectedWait(e: EffectDef): string {
  if (e.kind === "motion") return "usually 1 to 3 minutes";
  return e.usesAi ? "usually under a minute" : "usually 10 to 30 seconds";
}

export default function Studio({
  initialEffect,
  initialGenerationId,
}: {
  initialEffect: string;
  initialGenerationId: string | null;
}) {
  const [effectSlug, setEffectSlug] = useState(initialEffect);
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(initialGenerationId));
  const [caps, setCaps] = useState<Caps | null>(null);
  const [design, setDesign] = useState<{ title: string; source: string; remaining: number } | null>(null);
  const [designBusy, setDesignBusy] = useState(false);
  const [needsAi, setNeedsAi] = useState(false);
  const [aiRun, setAiRun] = useState(false);
  const [payNote, setPayNote] = useState<string | null>(null);
  const [payPending, setPayPending] = useState(false);
  const [payLabel, setPayLabel] = useState("");

  // Preview state
  const [nonce, setNonce] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);

  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOptions = useRef<EffectOptions | null>(null);

  const effect = EFFECTS[draft?.effect ?? effectSlug];
  const known: Caps = caps ?? ALL_CAPS;
  const resolved: Resolved = resolveEffect(effect, known);
  const localPreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);

  const phase: "upload" | "customize" | "working" | "done" | "failed" = !draft
    ? "upload"
    : status?.status === "COMPLETED"
      ? "done"
      : status?.status === "FAILED"
        ? "failed"
        : status && ["QUEUED", "PROCESSING", "AWAITING_PAYMENT"].includes(status.status)
          ? "working"
          : "customize";
  const stepIndex = { upload: 0, customize: 1, working: 2, done: 3, failed: 2 }[phase];

  // What the server can do right now (AI quota left, models enabled): drives honest availability and prices.
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((j) => { setCaps(j.caps); setPayLabel(j.payLabel ?? ""); }).catch(() => null);
  }, []);

  // Keep ?g=<id> in the URL so a refresh never loses a paid result.
  const syncUrl = useCallback((id: string | null) => {
    window.history.replaceState(null, "", id ? `?g=${id}` : window.location.pathname);
  }, []);

  // Restore after refresh.
  useEffect(() => {
    if (!initialGenerationId) return;
    api<{ id: string; status: Status["status"]; effect: string; options: EffectOptions; price: number; error: string | null; downloadUrl: string | null; design: { title: string; source: string; remaining: number } | null }>(
      `/api/generations/${initialGenerationId}`,
    )
      .then(({ ok, data }) => {
        if (!ok || data.status === "EXPIRED") return syncUrl(null);
        setDraft({ id: data.id, effect: data.effect, price: data.price, options: data.options });
        setStatus({ status: data.status, error: data.error, downloadUrl: data.downloadUrl });
        if (data.design) setDesign(data.design);
        const note = payResultMessage(new URLSearchParams(window.location.search).get("pay"));
        if (note && data.status === "DRAFT") setPayNote(note.text);
        setPayPending(Boolean((data as { payment?: { pending?: boolean } }).payment?.pending));
      })
      .catch(() => syncUrl(null))
      .finally(() => setRestoring(false));
  }, [initialGenerationId, syncUrl]);

  // Free preview: refetch whenever the effect, options, design or AI step change.
  useEffect(() => {
    if (!draft || phase !== "customize") return;
    const e = EFFECTS[draft.effect];
    const clearPreview = () =>
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
    setNeedsAi(false);
    if (e.kind === "motion") {
      clearPreview();
      setPreviewMsg("This premium effect has no free preview. Your result is generated after you press the button.");
      return;
    }
    if (e.kind === "html" && !design) {
      clearPreview();
      setPreviewMsg("Describe what you want below, then press “Design my animation” (or pick a free template).");
      return;
    }
    const ctrl = new AbortController();
    setPreviewLoading(true);
    setPreviewMsg(null);
    // Fetch the GIF as a blob so errors (like the preview limit) can be shown in plain words.
    fetch(`/api/generations/${draft.id}/sample?n=${nonce}${aiRun ? "&run=1" : ""}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (res.status === 202) {
          setNeedsAi(true); // AI effects only spend free AI quota when the customer asks
          clearPreview();
          return null;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Could not create a preview.");
        }
        return URL.createObjectURL(await res.blob());
      })
      .then((url) => {
        if (!url) return;
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        clearPreview();
        setPreviewMsg(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setPreviewLoading(false);
      });
    return () => ctrl.abort();
  }, [draft?.id, draft?.effect, nonce, phase, design, aiRun]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll while the job runs.
  useEffect(() => {
    if (!draft || (phase !== "working" && !payPending)) return;
    const t = setInterval(async () => {
      try {
        const { ok, data } = await api<Status & { payment?: { pending?: boolean } | null }>(`/api/generations/${draft.id}`);
        if (ok) {
          setStatus({ status: data.status, error: data.error, downloadUrl: data.downloadUrl });
          setPayPending(Boolean(data.payment?.pending));
          if (data.payment && !data.payment.pending) setPayNote(null);
        }
      } catch {
        /* network blip: keep polling */
      }
    }, 1500);
    return () => clearInterval(t);
  }, [draft, phase, payPending]);

  /* ---------- actions ---------- */

  async function pickFile(f: File | null | undefined) {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Please choose a photo (JPG, PNG, WebP or a photo straight from your phone).");
    try {
      setFile(await prepareImage(f, MAX_MB * 1024 * 1024));
    } catch {
      setError("We could not read that photo. Try a JPG or PNG, or take a new picture.");
    }
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("image", file);
    form.set("effect", effectSlug);
    form.set("options", JSON.stringify(defaultOptions(EFFECTS[effectSlug])));
    try {
      const { ok, data } = await api<{ generationId: string; effect: string; price: number; options: EffectOptions }>("/api/upload", {
        method: "POST",
        body: form,
      });
      if (!ok) return setError(data.error ?? "Upload failed. Please try again.");
      setDraft({ id: data.generationId, effect: data.effect, price: data.price, options: data.options });
      setStatus({ status: "DRAFT", error: null, downloadUrl: null });
      setDesign(null);
      setAiRun(false);
      setNonce((n) => n + 1);
      syncUrl(data.generationId);
    } catch {
      setError("Network problem. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const [blankPalette, setBlankPalette] = useState("midnight");
  const [blankSize, setBlankSize] = useState("square");

  /** "No photo" start: the AI designs on a plain colour background (Custom AI Animation only). */
  async function startBlank() {
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await api<{ generationId: string; effect: string; price: number; options: EffectOptions }>("/api/generations/blank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palette: blankPalette, size: blankSize }),
      });
      if (!ok) return setError(data.error ?? "Could not start. Please try again.");
      setEffectSlug("ai-custom");
      setDraft({ id: data.generationId, effect: data.effect, price: data.price, options: data.options });
      setStatus({ status: "DRAFT", error: null, downloadUrl: null });
      setDesign(null);
      setAiRun(false);
      setNonce((n) => n + 1);
      syncUrl(data.generationId);
    } catch {
      setError("Network problem. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function flushOptions(id: string) {
    if (patchTimer.current) clearTimeout(patchTimer.current);
    patchTimer.current = null;
    const opts = pendingOptions.current;
    pendingOptions.current = null;
    if (!opts) return false;
    const { ok } = await api(`/api/generations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: opts }),
    });
    return ok;
  }

  function updateOptions(patch: Partial<EffectOptions>) {
    if (!draft) return;
    const options = { ...draft.options, ...patch };
    setDraft({ ...draft, options });
    pendingOptions.current = options;
    if (patchTimer.current) clearTimeout(patchTimer.current);
    patchTimer.current = setTimeout(async () => {
      if (await flushOptions(draft.id)) setNonce((n) => n + 1);
    }, 600);
  }

  async function switchEffect(slug: string) {
    if (!draft || slug === draft.effect) return;
    await flushOptions(draft.id);
    const { ok, data } = await api<{ effect: string; price: number; options: EffectOptions }>(`/api/generations/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effect: slug }),
    });
    if (!ok) return setError(data.error ?? "Could not change the effect.");
    setDraft({ ...draft, effect: data.effect, price: data.price, options: data.options });
    setEffectSlug(data.effect);
    setNonce((n) => n + 1);
  }

  async function pay() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await flushOptions(draft.id);
      const res = await api(`/api/generations/${draft.id}/pay`, { method: "POST" });
      if (!res.ok) return setError(res.data.error ?? "Payment failed. You have not been charged.");
      const redirect = (res.data as { redirect?: Parameters<typeof goToGateway>[0] }).redirect;
      if (redirect) {
        setPayNote("Taking you to the payment page…");
        goToGateway(redirect);
        return; // the page leaves; busy stays on so the button cannot be pressed twice
      }
      const s = await api<Status>(`/api/generations/${draft.id}`);
      if (s.ok) setStatus({ status: s.data.status, error: s.data.error, downloadUrl: s.data.downloadUrl });
    } catch {
      setError("Network problem. You have not been charged.");
    } finally {
      if (!document.hidden) setBusy(false);
    }
  }

  async function tryAnotherEffect(slug: string) {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const { ok, data } = await api<{ generationId: string; effect: string; price: number; options: EffectOptions }>(
      `/api/generations/${draft.id}/clone`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ effect: slug }) },
    );
    setBusy(false);
    if (!ok) return setError(data.error ?? "Could not start that effect.");
    setPreviewUrl(null);
    setDesign(null);
    setAiRun(false);
    setDraft({ id: data.generationId, effect: data.effect, price: data.price, options: data.options });
    setEffectSlug(data.effect);
    setStatus({ status: "DRAFT", error: null, downloadUrl: null });
    setNonce((n) => n + 1);
    syncUrl(data.generationId);
  }

  async function makeDesign(template?: string) {
    if (!draft) return;
    setDesignBusy(true);
    setError(null);
    try {
      const { ok, data } = await api<{ title: string; source: string; remaining: number }>(`/api/generations/${draft.id}/design`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: draft.options.text, template }),
      });
      if (!ok) return setError(data.error ?? "Could not create the design. Please try again.");
      setDesign({ title: data.title, source: data.source, remaining: data.remaining });
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setDesignBusy(false);
    }
  }

  async function deleteMyFiles() {
    if (!draft) return;
    await fetch(`/api/generations/${draft.id}/files`, { method: "DELETE" }).catch(() => null);
    reset();
  }

  function reset() {
    setDesign(null);
    setAiRun(false);
    setNeedsAi(false);
    setFile(null);
    setDraft(null);
    setStatus(null);
    setError(null);
    setPreviewUrl(null);
    setPreviewMsg(null);
    syncUrl(null);
  }

  /* ---------- pieces ---------- */

  const steps = ["Upload", "Customize", "Create", "Download"];
  const Stepper = (
    <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === stepIndex ? "step" : undefined}>
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
              i < stepIndex ? "bg-emerald-500 text-black" : i === stepIndex ? "bg-fuchsia-500 text-white" : "bg-white/10 text-zinc-400"
            }`}
          >
            {i < stepIndex ? "✓" : i + 1}
          </span>
          <span className={`hidden sm:inline ${i === stepIndex ? "font-semibold text-white" : "text-zinc-400"}`}>{s}</span>
          {i < steps.length - 1 && <span className="h-px flex-1 bg-white/10" />}
        </li>
      ))}
    </ol>
  );

  // Called as a function (not used as <Component/>) so it is not remounted on every render.
  const effectStrip = (current: string, onPick: (slug: string) => void) => (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Choose an effect">
      {EFFECT_LIST.map((e) => {
        const r = resolveEffect(e, known);
        return (
          <button
            key={e.slug}
            role="option"
            aria-selected={e.slug === current}
            disabled={busy || !r.available}
            title={r.available ? e.tagline : r.reason}
            onClick={() => onPick(e.slug)}
            className={`w-28 shrink-0 overflow-hidden rounded-xl border text-left transition disabled:cursor-not-allowed ${
              e.slug === current ? "border-fuchsia-400 ring-2 ring-fuchsia-400/40" : "border-white/10 hover:border-white/30"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.sample} alt="" loading="lazy" className={`aspect-square w-full object-cover ${r.available ? "" : "opacity-40 grayscale"}`} />
            <div className="bg-white/5 p-2">
              <p className="truncate text-xs font-semibold">{e.name}</p>
              <p className="text-xs text-zinc-400">
                {r.available ? `${formatPrice(r.priceUsd)}${r.basic ? " · basic" : e.usesAi ? " · AI" : ""}` : "Not enabled yet"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );

  /** Plainly says how the movement is made, which mode runs, and what to be careful about. */
  const styleBlock = (e: EffectDef, r: Resolved) => (
    <div className="space-y-2">
      <p>
        <strong>{MOTION_STYLES[e.style].emoji} {MOTION_STYLES[e.style].label}.</strong>{" "}
        <span className="text-zinc-400">{MOTION_STYLES[e.style].note}</span>
      </p>
      {r.note && <p className="rounded-lg bg-amber-400/10 p-2 text-amber-200">{r.note}</p>}
      {e.needsFace && (
        <p className="rounded-lg bg-white/5 p-2 text-xs text-zinc-400">
          Use photos of yourself or of people who agreed to it. Do not use this to mislead or embarrass anyone.
        </p>
      )}
    </div>
  );

  const card = "rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6";
  const primary =
    "rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3 font-semibold text-white shadow-lg shadow-fuchsia-900/30 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
  const secondary = "rounded-full border border-white/20 px-5 py-3 font-semibold hover:bg-white/10 disabled:opacity-50";

  if (restoring) return <p className="py-20 text-center text-zinc-400">Loading your creation…</p>;

  /* ---------- phases ---------- */

  return (
    <div>
      {Stepper}

      {phase === "upload" && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className={card} aria-labelledby="up-h">
            <h1 id="up-h" className="text-2xl font-extrabold">Upload your photo</h1>
            <p className="mt-1 text-zinc-400">Any photo works: selfies, pets, products, family. Straight from your phone is fine: large photos are shrunk automatically.</p>

            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
              className={`mt-5 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                dragOver ? "border-fuchsia-400 bg-fuchsia-500/10" : "border-white/20 hover:border-white/40"
              }`}
            >
              {localPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={localPreview} alt="Your selected photo" className="max-h-64 rounded-xl" />
              ) : (
                <>
                  <span aria-hidden className="text-4xl">📷</span>
                  <span className="mt-3 font-semibold">Tap to choose a photo</span>
                  <span className="text-sm text-zinc-400">or drag and drop it here</span>
                </>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10">
                📸 Take a photo
                <input type="file" accept="image/*" capture={effect.needsFace ? "user" : "environment"} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
              </label>
              <span className="text-xs text-zinc-500">Opens your camera on phones.</span>
            </div>
            {localPreview && <p className="mt-2 text-center text-sm text-zinc-400">Tap the photo to choose a different one.</p>}

            <button className={`${primary} mt-5 w-full sm:w-auto`} disabled={!file || busy} onClick={upload}>
              {busy ? "Uploading…" : "Continue to free preview →"}
            </button>
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold">🧠 No photo? Just describe your GIF</p>
              <p className="mt-1 text-sm text-zinc-400">Pick a background colour and shape. Next, type your idea (birthday, Eid, sale…) and the AI designs the animation.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {PALETTES.map((p) => (
                  <button key={p.id} type="button" aria-label={p.label} title={p.label} onClick={() => setBlankPalette(p.id)}
                    className={`h-8 w-8 rounded-full border-2 ${blankPalette === p.id ? "border-white" : "border-transparent"}`} style={{ background: `linear-gradient(135deg,${p.bg1},${p.bg2})` }} />
                ))}
                <select value={blankSize} onChange={(e) => setBlankSize(e.target.value)} className="ml-auto rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm" aria-label="Shape">
                  <option value="square">Square</option>
                  <option value="portrait">Portrait 4:5</option>
                  <option value="story">Story 9:16</option>
                  <option value="landscape">Landscape 16:9</option>
                </select>
              </div>
              <button className={`${secondary} mt-3`} disabled={busy} onClick={startBlank}>Start from a colour background →</button>
            </div>
          </section>

          <aside className={card} aria-labelledby="fx-h">
            <h2 id="fx-h" className="font-bold">Chosen effect</h2>
            <div className="mt-3 flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={effect.sample} alt={`${effect.name} example`} className="h-28 w-28 rounded-xl object-cover" />
              <div>
                <p className="font-bold">{effect.emoji} {effect.name}</p>
                <p className="text-sm text-zinc-400">{effect.tagline}</p>
                <div className="mt-2"><PriceTag effect={effect} price={resolved.priceUsd} basic={resolved.basic} /></div>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">{effect.priceNote}</p>
            <div className="mt-3 text-xs">{styleBlock(effect, resolved)}</div>
            <h3 className="mb-2 mt-5 text-sm font-semibold text-zinc-300">Or pick another</h3>
            {effectStrip(effectSlug, setEffectSlug)}
          </aside>
        </div>
      )}

      {phase === "customize" && draft && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className={card} aria-labelledby="pv-h">
            <div className="flex items-center justify-between">
              <h1 id="pv-h" className="text-xl font-extrabold">Your free preview</h1>
              <button className="text-sm text-zinc-400 underline hover:text-white" onClick={reset}>Use a different photo</button>
            </div>
            <div className="relative mt-4 grid aspect-square w-full max-w-md place-items-center overflow-hidden rounded-2xl bg-zinc-900 mx-auto">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={`Preview of ${effect.name}`} className="h-full w-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/generations/${draft.id}/preview`} alt="Your photo" className="h-full w-full object-contain opacity-70" />
              )}
              {previewLoading && (
                <div className="absolute inset-0 grid place-items-center bg-black/50" role="status">
                  <span className="animate-pulse rounded-full bg-black/70 px-4 py-2 text-sm">Making your preview…</span>
                </div>
              )}
            </div>
            {previewMsg && <p className="mt-3 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">{previewMsg}</p>}
            {needsAi && (
              <div className="mt-3 rounded-xl border border-violet-400/30 bg-violet-500/10 p-4 text-sm">
                <p className="font-semibold">🤖 This effect needs a short AI step first</p>
                <p className="mt-1 text-zinc-300">
                  Your free preview uses a little of today&apos;s free AI allowance. The AI result is saved and reused when you generate, so nothing is repeated or charged twice.
                </p>
                <button className={`${primary} mt-3`} disabled={previewLoading} onClick={() => setAiRun(true)}>
                  Make my free AI preview
                </button>
              </div>
            )}
            <p className="mt-3 text-sm text-zinc-400">
              The preview is smaller and watermarked. <strong className="text-zinc-200">Your download is full quality and clean.</strong>
             
            </p>
          </section>

          <section className="space-y-5">
            <div className={card}>
              <h2 className="font-bold">Effect</h2>
              <div className="mt-3">{effectStrip(draft.effect, switchEffect)}</div>
            </div>

            <div className={`${card} text-sm`}>{styleBlock(effect, resolved)}</div>

            {(effect.text || effect.themes.length > 0 || effect.hasIntensity) && (
              <div className={`${card} space-y-5`}>
                <h2 className="font-bold">Make it yours</h2>
                {effect.text && (
                  <div>
                    <label htmlFor="opt-text" className="text-sm font-medium text-zinc-300">{effect.text.label}</label>
                    <input
                      id="opt-text"
                      value={draft.options.text}
                      maxLength={effect.text.maxLength}
                      placeholder={effect.text.placeholder}
                      onChange={(e) => updateOptions({ text: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
                    />
                    {effect.text.hint && <p className="mt-1 text-xs text-zinc-500">{effect.text.hint}</p>}
                  </div>
                )}
                {effect.kind === "html" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(effect.ideas ?? []).map((i) => (
                        <button key={i.label} type="button" onClick={() => updateOptions({ text: i.prompt })} className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-white/40">
                          {i.label}
                        </button>
                      ))}
                    </div>
                    <button className={`${primary} w-full`} disabled={designBusy || draft.options.text.trim().length < 3 || (design !== null && design.remaining <= 0 && design.source === "ai")} onClick={() => makeDesign()}>
                      {designBusy ? "Designing… (about 10 to 20 seconds)" : design ? "Design another version" : "🧠 Design my animation"}
                    </button>
                    {design && <p className="text-xs text-zinc-400">Created: “{design.title}”{design.source === "ai" ? ` · ${design.remaining} AI design${design.remaining === 1 ? "" : "s"} left for this photo` : design.source === "cache" ? " · a saved design, instant and free" : " · free template"}</p>}
                    <div>
                      <p className="text-xs text-zinc-500">Or start from a free template (no AI, no limit):</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {TEMPLATES.map((t) => (
                          <button key={t.id} type="button" disabled={designBusy} onClick={() => makeDesign(t.id)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-white/40 disabled:opacity-50">
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {effect.nudge && (
                  <fieldset>
                    <legend className="text-sm font-medium text-zinc-300">Flames not on the eyes? Nudge them</legend>
                    {(["x", "y"] as const).map((axis) => (
                      <label key={axis} className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
                        <span className="w-20">{axis === "x" ? "Left / right" : "Up / down"}</span>
                        <input type="range" min={-10} max={10} step={1} value={draft.options.nudge?.[axis] ?? 0} className="flex-1"
                          onChange={(ev) => updateOptions({ nudge: { x: draft.options.nudge?.x ?? 0, y: draft.options.nudge?.y ?? 0, [axis]: Number(ev.target.value) } })} />
                      </label>
                    ))}
                  </fieldset>
                )}
                {effect.themes.length > 0 && (
                  <fieldset>
                    <legend className="text-sm font-medium text-zinc-300">Colour style</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {effect.themes.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          aria-pressed={draft.options.theme === t.value}
                          onClick={() => updateOptions({ theme: t.value })}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                            draft.options.theme === t.value ? "border-fuchsia-400 bg-fuchsia-500/20" : "border-white/15 hover:border-white/40"
                          }`}
                        >
                          <span aria-hidden className="h-4 w-4 rounded-full ring-1 ring-white/30" style={{ background: t.swatch }} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {effect.hasIntensity && (
                  <fieldset>
                    <legend className="text-sm font-medium text-zinc-300">Strength</legend>
                    <div className="mt-2 inline-flex overflow-hidden rounded-full border border-white/15">
                      {LEVELS.map((l) => (
                        <button
                          key={l.value}
                          type="button"
                          aria-pressed={draft.options.intensity === l.value}
                          onClick={() => updateOptions({ intensity: l.value })}
                          className={`px-4 py-1.5 text-sm ${draft.options.intensity === l.value ? "bg-fuchsia-500/30 font-semibold" : "hover:bg-white/10"}`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            )}

            <div className={`${card} border-fuchsia-400/30`}>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Price for this GIF</p>
                  <PriceTag effect={effect} large price={draft.price} basic={resolved.basic} />
                </div>
                <p className="max-w-[12rem] text-right text-xs text-zinc-400">{effect.priceNote}</p>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-zinc-300">
                <li>✓ Full quality, no watermark</li>
                <li>✓ Charged only if your GIF is delivered</li>
                <li>✓ Download again for 24 hours at no extra cost</li>
              </ul>
              <button className={`${primary} mt-4 w-full`} disabled={busy || payPending || (effect.kind === "html" && !design)} onClick={pay}>
                {busy ? "Starting…" : effect.kind === "html" && !design ? "Create your design first" : `Pay ${formatPrice(draft.price)}${payLabel && !/test|simulator/i.test(payLabel) ? ` with ${payLabel}` : ""} and generate`}
              </button>
              {payNote && <p role="status" className="mt-3 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">{payNote}</p>}
              {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
            </div>
          </section>
        </div>
      )}

      {phase === "working" && draft && (
        <section className={`${card} mx-auto max-w-xl text-center`} role="status" aria-live="polite">
          <div aria-hidden className="text-5xl">{effect.emoji}</div>
          <h1 className="mt-3 text-2xl font-extrabold">{status?.status === "QUEUED" ? "You're in the queue…" : "Creating your GIF…"}</h1>
          <p className="mt-1 text-zinc-400">This is {expectedWait(effect)}. You can keep this page open, or come back to it later: your link is saved in the address bar.</p>
          <div className="mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500" />
          </div>
        </section>
      )}

      {phase === "failed" && draft && (
        <section className={`${card} mx-auto max-w-xl text-center`}>
          <div aria-hidden className="text-5xl">😕</div>
          <h1 className="mt-3 text-2xl font-extrabold">Something went wrong</h1>
          <p role="alert" className="mt-2 text-zinc-300">{status?.error ?? "Generation failed. You have not been charged."}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button className={primary} onClick={() => tryAnotherEffect(draft.effect)} disabled={busy}>Try again</button>
            <button className={secondary} onClick={reset}>Start over</button>
          </div>
        </section>
      )}

      {phase === "done" && draft && status?.downloadUrl && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className={card}>
            <h1 className="text-2xl font-extrabold">🎉 Your GIF is ready!</h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={status.downloadUrl} alt={`Your ${effect.name} GIF`} className="mx-auto mt-4 w-full max-w-md rounded-2xl" />
            <div className="mt-5 flex flex-wrap gap-3">
              <a className={`${primary} inline-block`} href={status.downloadUrl} download={`motionmagic-${effect.slug}.gif`}>
                ⬇ Download GIF
              </a>
              <button className={secondary} onClick={reset}>Make another with a new photo</button>
            </div>
            <p className="mt-3 text-sm text-zinc-400">You can download it again for the next 24 hours. After that it is deleted automatically.</p>
          </section>
          <section className="space-y-5">
            <div className={card}>
              <h2 className="font-bold">Love it? Try another effect on the same photo</h2>
              <p className="mt-1 text-sm text-zinc-400">You will get a free preview first. Nothing is charged until you generate.</p>
              <div className="mt-3">{effectStrip("", tryAnotherEffect)}</div>
              {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
            </div>
            <div className={card}>
              <h2 className="font-bold">Privacy</h2>
              <p className="mt-1 text-sm text-zinc-400">Done with it? You can delete your photo and GIF from our servers right now.</p>
              <button className={`${secondary} mt-3`} onClick={deleteMyFiles}>Delete my files now</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
