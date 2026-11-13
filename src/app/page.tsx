import FullHome from "@/components/full-home";
import PersonalizedStudio from "@/components/personalized-studio";
import { env } from "@/lib/env";
import { formatPrice } from "@/features/effects/catalog";
import { PERSONAL_PRICE_USD } from "@/features/personalized/meta";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "1", title: "Pick a design", text: "Choose a category, then an animated look." },
  { n: "2", title: "Type the name", text: "No photo needed." },
  { n: "3", title: "See it live", text: "Your name appears on the animation instantly." },
  { n: "4", title: "Pay and download", text: "Sign in, then Easypaisa. Full quality." },
];

const FAQ = [
  { q: "Do I need an account?", a: "Not to design and preview. When you press Download, you sign up in a few seconds with your email or Google. Your account shows how many GIFs you made and lets you download them again." },
  { q: "Is the preview free?", a: "Yes. You see the animation with your name before you pay, with nothing on it. Your GIF is created when you download it." },
  { q: "How do I pay?", a: "With Easypaisa, on Easypaisa's own secure page. We never see or ask for your PIN or OTP." },
  { q: "What if something goes wrong?", a: "If we cannot deliver your GIF after you pay, you are refunded." },
  { q: "How long is my GIF kept?", a: "We do not store your GIF at all. It is created when you press Download, so you can download it again from the same page while your link is valid." },
];

export default function Home({ searchParams }: { searchParams: { g?: string; cat?: string } }) {
  if (!env.personalizedOnly) return <FullHome searchParams={searchParams} />;
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:pt-12">
      <section className="mx-auto max-w-2xl text-center">
        <p className="inline-block rounded-full bg-fuchsia-500/15 px-3 py-1 text-sm font-medium text-fuchsia-200 ring-1 ring-fuchsia-400/30">✨ Personalized GIFs · Free live preview</p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          A GIF with <span className="bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-transparent">their name on it</span>
        </h1>
        <p className="mt-3 text-base text-zinc-300 sm:text-lg">Pick a category and a design, type a name, and share it on WhatsApp in a minute. {env.paymentRequired ? `Only ${formatPrice(PERSONAL_PRICE_USD)} per GIF.` : "Download is free."}</p>
      </section>

      <div className="mt-8"><PersonalizedStudio initialGenerationId={searchParams.g ?? null} /></div>

      <section className="mt-16" aria-labelledby="how">
        <h2 id="how" className="text-center text-2xl font-extrabold">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-fuchsia-500/20 font-bold text-fuchsia-200">{s.n}</span>
              <p className="mt-3 font-bold">{s.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-14 max-w-2xl" aria-labelledby="faq">
        <h2 id="faq" className="text-center text-2xl font-extrabold">Questions</h2>
        <div className="mt-5 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-sm text-zinc-300">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
