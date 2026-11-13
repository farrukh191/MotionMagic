import Link from "next/link";
import EffectGallery from "@/components/effect-gallery";
import { CATEGORIES, EFFECTS, formatPrice, type Category } from "@/features/effects/catalog";
import { getCaps } from "@/services/ai/capabilities";


const AUDIENCES: { emoji: string; title: string; text: string; cat: Category }[] = [
  { emoji: "📱", title: "Creators & social users", text: "Make posts and stories that stop the scroll.", cat: "social" },
  { emoji: "🎉", title: "Birthdays & celebrations", text: "Send a wish that moves: names, balloons, confetti.", cat: "celebrate" },
  { emoji: "🛍️", title: "Shops & sellers", text: "Bring product photos to life for listings and ads.", cat: "business" },
  { emoji: "🎬", title: "Anyone who loves a good look", text: "Movie-style zooms and glowing neon, no skills needed.", cat: "cinematic" },
];

const STEPS = [
  { n: "1", title: "Pick an effect", text: "Browse real examples. Prices are shown up front." },
  { n: "2", title: "Upload your photo", text: "No sign-up. JPG, PNG or WebP from your phone or computer." },
  { n: "3", title: "Preview it free", text: "Change the name, colours and strength. Watch it update." },
  { n: "4", title: "Download your GIF", text: "Pay only when you love it. Share it anywhere." },
];

const FAQ = [
  { q: "Do I need an account?", a: "No. Just upload a photo and go. You can use it as a guest." },
  { q: "Is the preview really free?", a: "Yes. The preview is smaller and carries a watermark. The file you download is full quality and clean." },
  { q: "When am I charged?", a: "Only when you press the generate button, and you are not charged if we cannot deliver your GIF." },
  { q: "What happens to my photo?", a: "It stays private. We never show it publicly, and it is deleted automatically after 24 hours (or sooner, when you choose)." },
  { q: "What does the AI badge mean?", a: "Those effects use an AI model to transform your photo first, which costs us more, so they cost a little more." },
];

export default async function FullHome({ searchParams }: { searchParams: { cat?: string } }) {
  const caps = await getCaps().catch(() => undefined);
  const initial = (CATEGORIES.find((c) => c.id === searchParams.cat)?.id ?? "all") as Category | "all";
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-8 pt-12 md:grid-cols-2 md:pt-20">
        <div>
          <p className="inline-block rounded-full bg-fuchsia-500/15 px-3 py-1 text-sm font-medium text-fuchsia-200 ring-1 ring-fuchsia-400/30">
            No sign-up · Free preview
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Turn any photo into an <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">animated GIF</span> people want to share
          </h1>
          <p className="mt-4 max-w-lg text-lg text-zinc-300">
            Pick an effect, upload a photo, preview it for free, and download in seconds. From {formatPrice(0.1)} per GIF.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/create" className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3 font-semibold shadow-lg shadow-fuchsia-900/30 hover:brightness-110">
              Make my GIF
            </Link>
            <Link href="#effects" className="rounded-full border border-white/20 px-6 py-3 font-semibold hover:bg-white/10">
              See examples
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400">
            <li>✓ Charged only if delivered</li>
            <li>✓ Private &amp; auto-deleted</li>
            <li>✓ No subscription</li>
          </ul>
        </div>

        {/* Before / after showcase */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3" aria-label="Before and after example">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/samples/original.png" alt="Original photo" className="aspect-square w-full rounded-2xl object-cover ring-1 ring-white/10" />
            <figcaption className="mt-2 text-center text-xs text-zinc-400">Your photo</figcaption>
          </figure>
          <span aria-hidden className="text-3xl text-fuchsia-300">→</span>
          <figure className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={EFFECTS["birthday-celebration"].sample} alt="Animated birthday example" className="aspect-square w-full rounded-2xl object-cover ring-2 ring-fuchsia-400/60" />
            <figcaption className="mt-2 text-center text-xs text-zinc-400">Your GIF</figcaption>
          </figure>
        </div>
      </section>

      {/* Audiences */}
      <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="who">
        <h2 id="who" className="text-2xl font-bold">Made for everyone</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a) => (
            <Link key={a.title} href={`/?cat=${a.cat}#effects`} className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-fuchsia-400/60">
              <div aria-hidden className="text-3xl">{a.emoji}</div>
              <h3 className="mt-3 font-bold">{a.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{a.text}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section id="effects" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10" aria-labelledby="fx">
        <h2 id="fx" className="text-2xl font-bold">Pick an effect</h2>
        <p className="mt-1 text-zinc-400">Every example below is a real GIF made with MotionMagic. Click one to try it with your own photo.</p>
        <div className="mt-6">
          <EffectGallery initialCategory={initial} caps={caps} />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10" aria-labelledby="how-h">
        <h2 id="how-h" className="text-2xl font-bold">How it works</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-fuchsia-500/20 font-bold text-fuchsia-200">{s.n}</span>
              <h3 className="mt-3 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-violet-500/10 p-8 text-center">
          <h2 className="text-2xl font-bold">Simple, honest pricing</h2>
          <p className="mx-auto mt-2 max-w-xl text-zinc-300">
            Classic effects are {formatPrice(0.1)}. Effects that use AI to transform your photo are {formatPrice(0.19)}. Premium AI motion is {formatPrice(0.49)}. Preview first, pay once, no subscription.
          </p>
          <Link href="/pricing" className="mt-4 inline-block font-semibold text-fuchsia-300 hover:text-fuchsia-200">See the full price list →</Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-10" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-bold">Questions</h2>
        <div className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold marker:content-none">
                <span className="mr-2 text-fuchsia-300 group-open:hidden">＋</span>
                <span className="mr-2 hidden text-fuchsia-300 group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 text-zinc-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
