"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BIZ_KINDS, BIZ_SIZES, BIZ_SIZE_IDS, BUSINESS_TEMPLATES, PALETTES, getBizTemplate, normalizeBizOptions, type BizKind, type BizOptions, type BizSizeId, type BizTemplate, type FieldKey, type PanelChoice,
} from "@/features/business/meta";
import { formatPrice } from "@/features/effects/catalog";
import { goToGateway, payResultMessage } from "@/lib/gateway-redirect";

type Draft = { id: string; templateId: string; price: number; options: BizOptions };
type Status = { status: "DRAFT" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED"; error: string | null; downloadUrl: string | null };

const card = "rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6";
const primary = "rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3 font-semibold text-white shadow-lg shadow-fuchsia-900/30 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-full border border-white/20 px-5 py-3 font-semibold hover:bg-white/10 disabled:opacity-50";
const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-fuchsia-400";

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, init);
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

/** Shrinks big phone photos in the browser. PNG/WebP stay PNG so a logo keeps its transparent background. */
async function shrink(file: File): Promise<File> {
  if (file.size < 1.5 * 1024 * 1024 && file.type !== "image/heic") return file;
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const jpeg = file.type === "image/jpeg";
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, jpeg ? "image/jpeg" : "image/png", 0.88));
  if (!blob) throw new Error("shrink failed");
  return new File([blob], jpeg ? "photo.jpg" : "photo.png", { type: blob.type });
}

export default function BusinessStudio({ initialTemplate, initialGenerationId }: { initialTemplate: string; initialGenerationId: string | null }) {
  const [kind, setKind] = useState<BizKind>(getBizTemplate(initialTemplate)?.kind ?? "product-ad");
  const [tpl, setTpl] = useState<BizTemplate>(getBizTemplate(initialTemplate) ?? BUSINESS_TEMPLATES[0]);
  const [options, setOptions] = useState<BizOptions>(() => normalizeBizOptions(tpl, { fields: tpl.sample }));
  const [files, setFiles] = useState<Record<string, File>>({});
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [haveSlots, setHaveSlots] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(Boolean(initialGenerationId));
  const [payNote, setPayNote] = useState<string | null>(null);
  const [payPending, setPayPending] = useState(false);
  const [payLabel, setPayLabel] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const working = status && (status.status === "QUEUED" || status.status === "PROCESSING");
  const done = status?.status === "COMPLETED" && status.downloadUrl;

  const syncUrl = (id: string | null) => {
    try {
      const u = new URL(window.location.href);
      if (id) u.searchParams.set("g", id); else u.searchParams.delete("g");
      window.history.replaceState(null, "", u.toString());
    } catch { /* ignore */ }
  };

  // Restore after a refresh.
  useEffect(() => {
    if (!initialGenerationId) return;
    api<{ id: string; status: Status["status"]; options: BizOptions; price: number; error: string | null; downloadUrl: string | null; business: { template: string; images: string[] } | null }>(`/api/generations/${initialGenerationId}`)
      .then(({ ok, data }) => {
        if (!ok || !data.business) return;
        const t = getBizTemplate(data.business.template)!;
        setTpl(t); setKind(t.kind); setOptions(data.options); setHaveSlots(data.business.images);
        setDraft({ id: data.id, templateId: t.id, price: data.price, options: data.options });
        setStatus({ status: data.status, error: data.error, downloadUrl: data.downloadUrl });
        const note = payResultMessage(new URLSearchParams(window.location.search).get("pay"));
        if (note && data.status === "DRAFT") setPayNote(note.text);
        setPayPending(Boolean((data as { payment?: { pending?: boolean } }).payment?.pending));
      })
      .finally(() => setRestoring(false));
  }, [initialGenerationId]);

  // Free preview whenever the draft or its options change.
  useEffect(() => {
    if (!draft || status?.status !== "DRAFT") return;
    const ctrl = new AbortController();
    setPreviewBusy(true);
    fetch(`/api/generations/${draft.id}/sample?n=${nonce}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Could not create a preview.");
        return URL.createObjectURL(await r.blob());
      })
      .then((url) => setPreview((old) => { if (old) URL.revokeObjectURL(old); return url; }))
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => { if (!ctrl.signal.aborted) setPreviewBusy(false); });
    return () => ctrl.abort();
  }, [draft?.id, nonce, status?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((j) => setPayLabel(j.payLabel ?? "")).catch(() => null);
  }, []);

  // Poll while the job runs, or while a payment is still being confirmed.
  useEffect(() => {
    if (!draft || (!working && !payPending)) return;
    const t = setInterval(async () => {
      const { ok, data } = await api<Status & { payment?: { pending?: boolean } | null }>(`/api/generations/${draft.id}`).catch(() => ({ ok: false, data: {} as Status & { payment?: { pending?: boolean } | null } }));
      if (!ok) return;
      setStatus({ status: data.status, error: data.error, downloadUrl: data.downloadUrl });
      setPayPending(Boolean(data.payment?.pending));
      if (data.payment && !data.payment.pending) setPayNote(null);
    }, 1500);
    return () => clearInterval(t);
  }, [draft, working, payPending]);

  const pushOptions = useCallback((next: BizOptions, templateId?: string) => {
    if (!draft) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { ok, data } = await api<{ template: string; price: number; options: BizOptions }>(`/api/business/${draft.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: templateId, options: next }),
      });
      if (!ok) return setError(data.error ?? "Could not save your changes.");
      setDraft((d) => (d ? { ...d, templateId: data.template, price: data.price, options: data.options } : d));
      setNonce((n) => n + 1);
    }, 700);
  }, [draft]);

  function update(patch: Partial<BizOptions>) {
    const next = { ...options, ...patch };
    setOptions(next);
    pushOptions(next);
  }
  const setField = (k: FieldKey, v: string) => update({ fields: { ...options.fields, [k]: v } });

  function pickTemplate(t: BizTemplate) {
    setTpl(t);
    setKind(t.kind);
    const next = normalizeBizOptions(t, { ...options, palette: t.palette, fields: draft || Object.keys(options.fields).length ? options.fields : t.sample });
    setOptions(next);
    if (draft && t.kind === getBizTemplate(draft.templateId)!.kind) pushOptions(next, t.id);
    else if (draft) { setDraft(null); setPreview(null); setStatus(null); setHaveSlots([]); setFiles({}); setThumbs({}); syncUrl(null); }
  }

  async function addFile(slot: string, f: File | undefined) {
    if (!f) return;
    setError(null);
    if (!f.type.startsWith("image/")) return setError("Please choose an image file (JPG, PNG or WebP).");
    try {
      const small = await shrink(f);
      setFiles((x) => ({ ...x, [slot]: small }));
      setThumbs((x) => ({ ...x, [slot]: URL.createObjectURL(small) }));
    } catch { setError("We could not read that image. Try a JPG or PNG."); }
  }

  async function createPreview() {
    setBusy(true); setError(null);
    const form = new FormData();
    form.set("template", tpl.id);
    form.set("options", JSON.stringify(options));
    for (const [k, f] of Object.entries(files)) form.set(k, f);
    const { ok, data } = await api<{ generationId: string; template: string; price: number; options: BizOptions; images: string[] }>("/api/business", { method: "POST", body: form }).catch(() => ({ ok: false, data: { error: "Network problem. Please try again." } as never }));
    setBusy(false);
    if (!ok) return setError((data as { error?: string }).error ?? "Could not start. Please try again.");
    setDraft({ id: data.generationId, templateId: data.template, price: data.price, options: data.options });
    setHaveSlots(data.images);
    setStatus({ status: "DRAFT", error: null, downloadUrl: null });
    syncUrl(data.generationId);
    setNonce((n) => n + 1);
  }

  async function pay() {
    if (!draft) return;
    setBusy(true); setError(null);
    if (timer.current) { clearTimeout(timer.current); await api(`/api/business/${draft.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ options }) }); }
    const r = await api(`/api/generations/${draft.id}/pay`, { method: "POST" }).catch(() => ({ ok: false, data: { error: "Network problem. You have not been charged." } as never }));
    if (!r.ok) setError((r.data as { error?: string }).error ?? "Payment failed. You have not been charged.");
    else if ((r.data as { redirect?: Parameters<typeof goToGateway>[0] }).redirect) {
      setPayNote("Taking you to the payment page…");
      goToGateway((r.data as { redirect: Parameters<typeof goToGateway>[0] }).redirect);
      return; // the page leaves; the button stays disabled
    } else {
      const s = await api<Status>(`/api/generations/${draft.id}`);
      if (s.ok) setStatus({ status: s.data.status, error: s.data.error, downloadUrl: s.data.downloadUrl });
    }
    setBusy(false);
  }

  function startOver() {
    setDraft(null); setPreview(null); setStatus(null); setFiles({}); setThumbs({}); setHaveSlots([]); setError(null); syncUrl(null);
    setOptions(normalizeBizOptions(tpl, { fields: tpl.sample }));
  }

  if (restoring) return <p className="py-20 text-center text-zinc-400">Loading your creation…</p>;

  const price = draft?.price ?? BIZ_KINDS.find((k) => k.id === tpl.kind)!.priceUsd;
  const locked = Boolean(draft); // images are fixed once the draft exists
  const missingImg = tpl.images.filter((s) => s.required && !files[s.key] && !haveSlots.includes(s.key));
  const showPanel = tpl.kind === "logo" || tpl.kind === "banner";

  if (done && draft) {
    return (
      <div className={`${card} text-center`}>
        <h2 className="text-2xl font-extrabold">🎉 Your GIF is ready</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={status!.downloadUrl!} alt="Your GIF" className="mx-auto mt-4 w-full max-w-md rounded-2xl" />
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a className={`${primary} inline-block`} href={status!.downloadUrl!} download={`motionmagic-${tpl.id}.gif`}>Download GIF</a>
          <button className={secondary} onClick={startOver}>Make another</button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">Your files are deleted automatically after 24 hours. Download again anytime until then, at no extra charge.</p>
      </div>
    );
  }
  if (working) return <div className={`${card} py-16 text-center`}><p className="text-xl font-bold">✨ Creating your GIF…</p><p className="mt-2 text-zinc-400">Usually 10 to 40 seconds. You can keep this tab open.</p></div>;

  return (
    <div className="space-y-6">
      {/* 1. choose a look */}
      <section className={card}>
        <h2 className="text-lg font-bold">1. Choose a look</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist">
          {BIZ_KINDS.map((k) => (
            <button key={k.id} role="tab" aria-selected={kind === k.id} disabled={locked && k.id !== tpl.kind}
              onClick={() => { setKind(k.id); if (k.id !== tpl.kind) pickTemplate(BUSINESS_TEMPLATES.find((t) => t.kind === k.id)!); }}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-40 ${kind === k.id ? "border-fuchsia-400 bg-fuchsia-500/20" : "border-white/10 bg-white/5 hover:border-white/30"}`}>
              {k.emoji} {k.label} · {formatPrice(k.priceUsd)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-zinc-400">{BIZ_KINDS.find((k) => k.id === kind)!.blurb}</p>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {BUSINESS_TEMPLATES.filter((t) => t.kind === kind).map((t) => (
            <button key={t.id} onClick={() => pickTemplate(t)} aria-pressed={t.id === tpl.id}
              className={`w-36 shrink-0 overflow-hidden rounded-xl border text-left ${t.id === tpl.id ? "border-fuchsia-400 ring-2 ring-fuchsia-400/40" : "border-white/10 hover:border-white/30"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/samples/${t.slug}.gif`} alt="" loading="lazy" className="aspect-square w-full bg-black object-cover" />
              <div className="bg-white/5 p-2"><p className="truncate text-xs font-semibold">{t.emoji} {t.name}</p><p className="truncate text-xs text-zinc-400">{t.tagline}</p></div>
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-zinc-500">Samples use made-up text and pictures. Your GIF uses only what you type and upload.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2. your content */}
        <section className={`${card} space-y-4`}>
          <h2 className="text-lg font-bold">2. Add your content</h2>
          {tpl.images.map((s) => (
            <div key={s.key}>
              <p className="text-sm font-medium text-zinc-300">{s.label}{s.required ? " *" : ""}</p>
              {locked ? (
                <p className="mt-1 text-xs text-zinc-500">{haveSlots.includes(s.key) ? "✓ Uploaded" : "Not added"}</p>
              ) : (
                <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 p-3 hover:border-white/40">
                  {thumbs[s.key] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbs[s.key]} alt="" className="h-14 w-14 rounded-lg bg-white/10 object-contain" /> : <span className="grid h-14 w-14 place-items-center rounded-lg bg-white/10 text-2xl">＋</span>}
                  <span className="text-sm text-zinc-300">{thumbs[s.key] ? "Change image" : "Choose or take a photo"}</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => addFile(s.key, e.target.files?.[0])} />
                </label>
              )}
            </div>
          ))}
          {tpl.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-sm font-medium text-zinc-300">{f.label}{f.required ? " *" : ""}</span>
              <input className={`${input} mt-1`} value={options.fields[f.key] ?? ""} maxLength={f.maxLength} placeholder={f.placeholder} onChange={(e) => setField(f.key, e.target.value)} />
            </label>
          ))}
          <p className="text-xs text-zinc-500">We never invent names, prices or claims. Everything shown is exactly what you type.</p>

          <div>
            <p className="text-sm font-medium text-zinc-300">Size</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {BIZ_SIZE_IDS.map((id: BizSizeId) => (
                <button key={id} onClick={() => update({ size: id })} title={BIZ_SIZES[id].hint}
                  className={`rounded-full border px-3 py-1.5 text-xs ${options.size === id ? "border-fuchsia-400 bg-fuchsia-500/20" : "border-white/15 hover:border-white/40"}`}>{BIZ_SIZES[id].label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">Colours</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {PALETTES.map((p) => (
                <button key={p.id} aria-label={p.label} title={p.label} onClick={() => update({ palette: p.id })}
                  className={`h-9 w-9 rounded-full border-2 ${options.palette === p.id ? "border-white" : "border-transparent"}`} style={{ background: `linear-gradient(135deg,${p.bg1},${p.bg2})`, boxShadow: `inset 0 0 0 4px ${p.accent}` }} />
              ))}
            </div>
          </div>
          {showPanel && (
            <div>
              <p className="text-sm font-medium text-zinc-300">Behind your image</p>
              <div className="mt-1 flex gap-2">
                {(["auto", "white", "dark", "none"] as PanelChoice[]).map((c) => (
                  <button key={c} onClick={() => update({ panel: c })} className={`rounded-full border px-3 py-1.5 text-xs capitalize ${options.panel === c ? "border-fuchsia-400 bg-fuchsia-500/20" : "border-white/15 hover:border-white/40"}`}>{c === "none" ? "Nothing" : c}</button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. preview and pay */}
        <section className={`${card} lg:sticky lg:top-4 lg:self-start`}>
          <h2 className="text-lg font-bold">3. Preview and download</h2>
          <div className="mt-3 grid min-h-64 place-items-center overflow-hidden rounded-xl bg-black/40">
            {preview && draft ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="Preview" className={`max-h-[460px] w-full object-contain ${previewBusy ? "opacity-50" : ""}`} />
              : <p className="p-6 text-center text-sm text-zinc-400">{previewBusy ? "Creating preview…" : "Add your content, then press “Create free preview”."}</p>}
          </div>
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          {payNote && <p role="status" className="mt-3 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">{payNote}</p>}
          {status?.status === "FAILED" && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{status.error}</p>}
          {!draft ? (
            <button className={`${primary} mt-4 w-full`} disabled={busy || missingImg.length > 0} onClick={createPreview}>
              {busy ? "Starting…" : missingImg.length ? `Add: ${missingImg.map((s) => s.label.split(" (")[0].toLowerCase()).join(", ")}` : "Create free preview"}
            </button>
          ) : (
            <>
              <button className={`${primary} mt-4 w-full`} disabled={busy || payPending} onClick={pay}>{busy ? "Starting…" : `Pay ${formatPrice(price)}${payLabel && !/test|simulator/i.test(payLabel) ? ` with ${payLabel}` : ""} and generate`}</button>
              <button className={`${secondary} mt-2 w-full`} onClick={startOver}>Start over</button>
            </>
          )}
          <p className="mt-3 text-xs text-zinc-500">The preview is smaller and watermarked. The final GIF has no watermark. Template animation: no AI. Failed jobs are refunded automatically.</p>
        </section>
      </div>
    </div>
  );
}
