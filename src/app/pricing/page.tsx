import Link from "next/link";
import { PriceTag } from "@/components/effect-card";
import { EFFECT_LIST, formatPrice } from "@/features/effects/catalog";
import { BIZ_KINDS } from "@/features/business/meta";
import { PERSONAL_PRICE_USD, PERSONAL_TEMPLATES } from "@/features/personalized/meta";
import { env } from "@/lib/env";

export const metadata = { title: "Pricing · MotionMagic" };

export default function Pricing() {
  if (env.personalizedOnly) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-extrabold">Pricing</h1>
        <p className="mt-2 text-zinc-300">One simple price. The preview is always free. No subscription, no hidden fees.</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-4xl font-extrabold">{formatPrice(PERSONAL_PRICE_USD)}</p>
          <p className="mt-1 text-zinc-300">per personalized birthday GIF, any design</p>
          <ul className="mt-4 space-y-1 text-sm text-zinc-300">
            {PERSONAL_TEMPLATES.map((t) => <li key={t.id}>{t.emoji} {t.name}</li>)}
          </ul>
          <Link href="/#tp" className="mt-5 inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3 font-semibold">Make a birthday GIF</Link>
        </div>
        <p className="mt-6 text-sm text-zinc-400">You pay with Easypaisa on Easypaisa&apos;s own secure page. We never ask for your PIN or OTP. If we cannot deliver your GIF, you are refunded.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-extrabold">Pricing</h1>
      <p className="mt-2 text-zinc-300">Pay per GIF. Preview is always free. No subscription, no hidden fees.</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-zinc-400">
            <tr>
              <th className="p-4">Effect</th>
              <th className="hidden p-4 sm:table-cell">What you pay for</th>
              <th className="p-4 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {EFFECT_LIST.map((e) => (
              <tr key={e.slug}>
                <td className="p-4 font-semibold">
                  <Link href={`/create?effect=${e.slug}`} className="hover:text-fuchsia-300">
                    {e.emoji} {e.name}
                  </Link>
                </td>
                <td className="hidden p-4 text-zinc-400 sm:table-cell">{e.priceNote}</td>
                <td className="p-4 text-right"><PriceTag effect={e} /></td>
              </tr>
            ))}
            {BIZ_KINDS.map((k) => (
              <tr key={k.id}>
                <td className="p-4 font-semibold"><Link href="/business" className="hover:text-fuchsia-300">{k.emoji} Business: {k.label}</Link></td>
                <td className="hidden p-4 text-zinc-400 sm:table-cell">{k.blurb} Template animation, no AI.</td>
                <td className="p-4 text-right font-bold">{formatPrice(k.priceUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-8 grid gap-3 text-zinc-300 sm:grid-cols-2">
        <li className="rounded-xl bg-white/5 p-4">👀 <strong>Free preview</strong> (smaller, watermarked) before you pay.</li>
        <li className="rounded-xl bg-white/5 p-4">↩️ <strong>Not delivered, not charged.</strong> Failed jobs are refunded automatically.</li>
        <li className="rounded-xl bg-white/5 p-4">⬇️ <strong>Download again</strong> any time within 24 hours, no extra charge.</li>
        <li className="rounded-xl bg-white/5 p-4">🔒 <strong>Private.</strong> Photos and results are deleted after 24 hours.</li>
      </ul>
      <Link href="/create" className="mt-8 inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3 font-semibold">Start free preview</Link>
      <p className="mt-6 max-w-2xl text-sm text-zinc-400">You see the price in rupees before you start. You pay securely with Easypaisa, then your GIF is created. If it fails, you get your money back. Previews are always free.</p>
    </main>
  );
}
