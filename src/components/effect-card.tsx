import Link from "next/link";
import { MOTION_STYLES, formatPrice, resolveEffect, type Caps, type EffectDef } from "@/features/effects/catalog";

export function PriceTag({ effect, large = false, price, basic = false }: { effect: EffectDef; large?: boolean; price?: number; basic?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`font-extrabold text-white ${large ? "text-2xl" : "text-base"}`}>{formatPrice(price ?? effect.priceUsd)}</span>
      {basic && <span className="rounded-full bg-zinc-700/60 px-2 py-0.5 text-[11px] font-semibold text-zinc-200">Basic</span>}
      {effect.usesAi && !basic && (
        <span
          title={effect.priceNote}
          className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] font-semibold text-violet-200 ring-1 ring-violet-400/40"
        >
          AI
        </span>
      )}
    </span>
  );
}

export default function EffectCard({ effect, caps }: { effect: EffectDef; caps?: Caps }) {
  const r = resolveEffect(effect, caps ?? { text: true, eyes: true, imageEdit: true, motion: true });
  const style = MOTION_STYLES[effect.style];
  const body = (
    <>
      <div className="relative aspect-square overflow-hidden bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={effect.sample} alt={`${effect.name} example`} loading="lazy" className={`h-full w-full object-cover ${r.available ? "" : "opacity-40 grayscale"}`} />
        <div className="absolute left-2 top-2 flex gap-1.5">
          {effect.popular && r.available && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-black">🔥 Popular</span>}
          {effect.beta && <span className="rounded-full bg-zinc-800/90 px-2 py-0.5 text-[11px] font-bold text-zinc-200">Beta</span>}
          {!r.available && <span className="rounded-full bg-zinc-900/90 px-2 py-0.5 text-[11px] font-bold text-zinc-200">Not enabled yet</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-tight">
            <span aria-hidden>{effect.emoji} </span>
            {effect.name}
          </h3>
          <PriceTag effect={effect} price={r.priceUsd} basic={r.basic} />
        </div>
        <p className="text-sm text-zinc-400">{effect.tagline}</p>
        <p className="text-[11px] text-zinc-500" title={style.note}>{style.emoji} {style.label}</p>
        {r.available ? (
          <span className="mt-auto pt-2 text-sm font-semibold text-fuchsia-300 group-hover:text-fuchsia-200">Try it free →</span>
        ) : (
          <span className="mt-auto pt-2 text-xs text-zinc-500">{r.reason}</span>
        )}
      </div>
    </>
  );
  if (!r.available) return <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]" aria-disabled="true">{body}</div>;
  return (
    <Link
      href={`/create?effect=${effect.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-fuchsia-400/60 hover:bg-white/[0.07]"
    >
      {body}
    </Link>
  );
}
