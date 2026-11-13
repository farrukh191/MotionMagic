"use client";

import { useState } from "react";
import EffectCard from "@/components/effect-card";
import { CATEGORIES, EFFECT_LIST, type Caps, type Category } from "@/features/effects/catalog";

export default function EffectGallery({ initialCategory = "all", caps }: { initialCategory?: Category | "all"; caps?: Caps }) {
  const [cat, setCat] = useState<Category | "all">(initialCategory);
  const list = cat === "all" ? EFFECT_LIST : EFFECT_LIST.filter((e) => (cat === "ai" ? e.usesAi : e.categories.includes(cat)));

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Filter effects">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => setCat(c.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
              cat === c.id
                ? "border-fuchsia-400 bg-fuchsia-500/20 text-white"
                : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30"
            }`}
          >
            <span aria-hidden>{c.emoji} </span>
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {list.map((e) => (
          <EffectCard key={e.slug} effect={e} caps={caps} />
        ))}
      </div>
    </div>
  );
}
