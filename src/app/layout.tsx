import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "MotionMagic · Birthday GIFs with their name",
  description:
    "Pick an animated birthday design, type a name, preview it free and download a share-ready GIF. Sign in only when you download.",
};

async function Header() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0b12]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600">✨</span>
          <span>MotionMagic</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-300 sm:flex" aria-label="Main">
          <Link href={env.personalizedOnly ? "/#tp" : "/#effects"} className="hover:text-white">{env.personalizedOnly ? "Designs" : "Effects"}</Link>
          <Link href="/#how" className="hover:text-white">How it works</Link>
          {!env.personalizedOnly && <Link href="/business" className="hover:text-white">For business</Link>}
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
        <Link href="/account" className="rounded-full border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10">{user ? `👤 ${user.name.split(" ")[0]}` : "Sign in"}</Link>
        <Link
          href={env.personalizedOnly ? "/#tp" : "/create"}
          className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-900/30 hover:brightness-110"
        >
          {env.personalizedOnly ? "Make a GIF" : "Start free preview"}
        </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 py-10 text-sm text-zinc-400">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3">
        <div>
          <p className="font-bold text-white">MotionMagic</p>
          <p className="mt-2">{env.personalizedOnly ? "Personalized animated birthday GIFs." : "Turn ordinary photos into eye-catching animated GIFs."}</p>
        </div>
        <ul className="space-y-1">
          <li>🔒 Your GIFs are private and created only when you download them.</li>
          <li>↩️ Not delivered? You are not charged.</li>
        </ul>
        <p>By uploading you confirm you have the right to use the image.</p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
