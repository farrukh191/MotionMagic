/**
 * Generates the gallery sample GIFs (public/samples) and prints a size table. No AI spend, no database.
 * AI effects use illustrated stand-ins for the AI result (see sample-prep.ts). Run: npm run samples
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { EFFECT_LIST, levelToNumber } from "@/features/effects/catalog";
import { closeBrowser } from "@/features/effects/html/browser";
import { festivalDesign } from "@/features/effects/html/presets";
import { renderDesignGif } from "@/features/effects/html/render-html";
import { sanitizeDesign } from "@/features/effects/html/sanitize";
import { FINAL_SPEC, hasRenderer, renderEffect } from "@/features/effects/render";
import { sampleImage } from "./sample-image";
import { samplePrep } from "./sample-prep";

const SAMPLE_TEXT: Record<string, string> = {
  "birthday-celebration": "Ayesha",
  "cinematic-zoom": "Summer Sale",
  "superhero-transformation": "Captain Ayesha",
};

async function main() {
  const out = path.resolve("public/samples");
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(path.join(out, "original.png"), await sharp(await sampleImage(900)).resize(480).png().toBuffer());

  console.log("effect".padEnd(26), "size".padStart(9), "dims".padStart(10), "frames", "ms");
  for (const e of EFFECT_LIST) {
    const t0 = Date.now();
    let res;
    if (e.kind === "html") {
      const clean = await sanitizeDesign(festivalDesign("Eid Mubarak"));
      res = await renderDesignGif(clean.html, await sampleImage(900), { ...FINAL_SPEC, seconds: e.durationSeconds });
    } else if (hasRenderer(e.slug)) {
      const { image, extras } = await samplePrep(e);
      res = await renderEffect(
        e.slug, image,
        { text: SAMPLE_TEXT[e.slug] ?? "", theme: e.defaultTheme, level: levelToNumber("medium") },
        { ...FINAL_SPEC, seconds: e.durationSeconds }, extras,
      );
    } else continue;
    await fs.writeFile(path.join(out, `${e.slug}.gif`), res.gif);
    console.log(e.slug.padEnd(26), `${(res.gif.length / 1024).toFixed(0)} KB`.padStart(9), `${res.width}x${res.height}`.padStart(10), String(res.frames).padStart(6), Date.now() - t0);
  }
  await closeBrowser();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
