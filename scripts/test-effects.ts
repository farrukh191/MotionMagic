/**
 * Phase 2 quality + size test. No database, no AI spend.
 * Renders every effect with every theme, different photo shapes, a worst-case noisy photo,
 * hostile text, and free-preview mode, then asserts on the actual GIF files.
 * Run: npm run test:effects      (requires ffmpeg on PATH)
 */
import sharp from "sharp";
import { EFFECT_LIST, levelToNumber, type Level } from "@/features/effects/catalog";
import { FINAL_SPEC, PREVIEW_SPEC, renderEffect } from "@/features/effects/render";
import { mockCartoonize } from "@/services/ai/mock-toolbox";
import { EFFECTS } from "@/features/effects/catalog";
import { sampleImage } from "./sample-image";
import { loopRatio } from "./test-lib";

const FINAL_MAX = 5 * 1024 * 1024;
const PREVIEW_MAX = 1.5 * 1024 * 1024;

type Row = { name: string; kb: number; dims: string; frames: number; step: number; ms: number; loopRatio: number };
const rows: Row[] = [];
const failures: string[] = [];
const check = (ok: boolean, msg: string) => {
  if (!ok) failures.push(msg);
};

async function photo(kind: "square" | "landscape" | "portrait" | "tiny" | "noisy"): Promise<Buffer> {
  const base = await sampleImage(900);
  switch (kind) {
    case "square":
      return base;
    case "landscape":
      return sharp(base).resize(1200, 900, { fit: "cover" }).png().toBuffer();
    case "portrait":
      return sharp(base).resize(600, 900, { fit: "cover" }).png().toBuffer();
    case "tiny":
      return sharp(base).resize(120, 120).png().toBuffer();
    case "noisy": {
      // Worst case for GIF: real-photo-like grain everywhere.
      const noise = await sharp({
        create: {
          width: 1200,
          height: 900,
          channels: 3,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
          noise: { type: "gaussian", mean: 128, sigma: 55 },
        },
      }).png().toBuffer();
      return sharp(base).resize(1200, 900, { fit: "cover" }).composite([{ input: noise, blend: "overlay" }]).png().toBuffer();
    }
  }
}

async function run(
  label: string,
  slug: string,
  image: Buffer,
  opts: { text?: string; theme: string; level?: Level },
  mode: "final" | "preview",
  seconds: number,
  usesAi: boolean,
  checkLoop: boolean,
) {
  const t0 = Date.now();
  const def = EFFECTS[slug];
  let source = image;
  const extras: { edited?: Buffer; eyes?: { left: { x: number; y: number }; right: { x: number; y: number }; width: number } } = {};
  if (usesAi && def.ai === "edit" && def.editKind === "cartoon") source = await mockCartoonize(image);
  else if (usesAi && def.ai === "edit") extras.edited = await sharp(image).modulate({ saturation: 1.3, hue: 40 }).toBuffer(); // stand-in for the AI edit
  else if (usesAi && def.ai === "eyes") extras.eyes = { left: { x: 0.4, y: 0.45 }, right: { x: 0.6, y: 0.45 }, width: 0.1 };
  const spec = { ...(mode === "final" ? FINAL_SPEC : PREVIEW_SPEC), seconds };
  const res = await renderEffect(slug, source, { text: opts.text ?? "", theme: opts.theme, level: levelToNumber(opts.level ?? "medium") }, spec, extras);
  const max = mode === "final" ? FINAL_MAX : PREVIEW_MAX;
  const ratio = checkLoop ? await loopRatio(res.gif, res.frames) : 0;

  check(res.gif.subarray(0, 6).toString("ascii").startsWith("GIF89a"), `${label}: not a GIF`);
  check(res.gif.includes(Buffer.from("NETSCAPE2.0")), `${label}: GIF does not loop`);
  check(res.gif.length <= max, `${label}: ${(res.gif.length / 1024).toFixed(0)} KB exceeds ${(max / 1024).toFixed(0)} KB`);
  check(res.frames === Math.round(spec.fps * seconds), `${label}: wrong frame count ${res.frames}`);
  check(Math.max(res.width, res.height) <= spec.maxSize, `${label}: output larger than ${spec.maxSize}px`);
  if (checkLoop) check(ratio < 4, `${label}: loop seam is ${ratio.toFixed(1)}x a normal frame step (visible jump)`);

  rows.push({ name: label, kb: Math.round(res.gif.length / 1024), dims: `${res.width}x${res.height}`, frames: res.frames, step: res.step, ms: Date.now() - t0, loopRatio: ratio });
}

async function main() {
  const square = await photo("square");
  const landscape = await photo("landscape");
  const portrait = await photo("portrait");
  const tiny = await photo("tiny");
  const noisy = await photo("noisy");

  for (const e of EFFECT_LIST.filter((x) => x.kind === "built-in")) {
    const sec = e.durationSeconds;
    // every theme, landscape photo, full quality
    for (const t of e.themes) {
      await run(`${e.slug} theme=${t.value} landscape`, e.slug, landscape, { theme: t.value, text: e.text ? "Sample" : "" }, "final", sec, e.usesAi, t === e.themes[0]);
    }
    // strongest setting, other photo shapes
    await run(`${e.slug} high portrait`, e.slug, portrait, { theme: e.defaultTheme, level: "high", text: e.text ? "Sample" : "" }, "final", sec, e.usesAi, false);
    await run(`${e.slug} low tiny-120px`, e.slug, tiny, { theme: e.defaultTheme, level: "low" }, "final", sec, e.usesAi, false);
    // worst-case grainy photo must still fit the size budget
    await run(`${e.slug} NOISY worst-case`, e.slug, noisy, { theme: e.defaultTheme, level: "high" }, "final", sec, e.usesAi, false);
    // free preview: small + watermarked
    await run(`${e.slug} PREVIEW`, e.slug, square, { theme: e.defaultTheme }, "preview", sec, false, false);
  }

  // hostile / awkward text must render safely
  for (const text of ["<script>alert(1)</script>", `A&B "quotes" 'x'`, "Averyveryverylongnamethatgoesonandon", "😀 مرحبا"]) {
    await run(`birthday text=${JSON.stringify(text).slice(0, 22)}`, "birthday-celebration", square, { theme: "party", text }, "final", 4, false, false);
    await run(`zoom title=${JSON.stringify(text).slice(0, 22)}`, "cinematic-zoom", square, { theme: "warm", text }, "final", 4, false, false);
  }

  console.log("\n" + "case".padEnd(48), "KB".padStart(6), "dims".padStart(9), "ladder", "loop×".padStart(6), "ms".padStart(6));
  for (const r of rows) {
    console.log(r.name.padEnd(48), String(r.kb).padStart(6), r.dims.padStart(9), String(r.step).padStart(6), (r.loopRatio ? r.loopRatio.toFixed(2) : "-").padStart(6), String(r.ms).padStart(6));
  }
  const finals = rows.filter((r) => !r.name.includes("PREVIEW"));
  console.log(`\n${rows.length} renders · largest final ${Math.max(...finals.map((r) => r.kb))} KB · slowest ${Math.max(...rows.map((r) => r.ms))} ms`);

  if (failures.length) {
    console.error(`\nFAILED (${failures.length}):\n - ${failures.join("\n - ")}`);
    process.exit(1);
  }
  console.log("ALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
