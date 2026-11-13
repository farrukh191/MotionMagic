import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import BusinessStudio from "@/components/business-studio";
import { BUSINESS_TEMPLATES } from "@/features/business/meta";

export const metadata = { title: "Business studio · MotionMagic", description: "Animated product ads, logos, banners and showcases for your business." };

export default function BusinessPage({ searchParams }: { searchParams: { template?: string; g?: string } }) {
  if (env.personalizedOnly) redirect("/"); // personalized-only mode: pick a birthday template instead
  const initial = BUSINESS_TEMPLATES.find((t) => t.id === searchParams.template)?.id ?? "ad-spotlight";
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-extrabold">Business Animation Studio</h1>
      <p className="mt-2 max-w-2xl text-zinc-300">
        Animated ads, logos, banners and product showcases. Your product names, prices and logo are used exactly as you give them, never redrawn or invented.
      </p>
      <div className="mt-6">
        <BusinessStudio initialTemplate={initial} initialGenerationId={searchParams.g ?? null} />
      </div>
    </main>
  );
}
