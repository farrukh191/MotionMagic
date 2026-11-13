import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import Studio from "@/components/studio";
import { EFFECTS } from "@/features/effects/catalog";

export const metadata = { title: "Create your GIF · MotionMagic" };

export default function CreatePage({ searchParams }: { searchParams: { effect?: string; g?: string } }) {
  if (env.personalizedOnly) redirect("/"); // personalized-only mode: pick a birthday template instead
  const effect = searchParams.effect && EFFECTS[searchParams.effect] ? searchParams.effect : "flying-hearts";
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Studio initialEffect={effect} initialGenerationId={searchParams.g ?? null} />
    </main>
  );
}
