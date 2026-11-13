import sharp from "sharp";
import { TAU, rng, svg, toPng } from "./util";
import type { EffectRenderer } from "./types";

const THEMES: Record<string, { top: string; bottom: string; cloud: string }> = {
  pastel: { top: "#bfe3ff", bottom: "#ffd6ec", cloud: "#ffffff" },
  sunset: { top: "#ffb88c", bottom: "#ff8fb1", cloud: "#fff1e6" },
  night: { top: "#5b5bd6", bottom: "#b69cff", cloud: "#e9e6ff" },
};

/** Soft cloud sprite built from overlapping circles (no external art). */
function cloud(cx: number, cy: number, s: number, rnd: () => number): string {
  let d = "";
  const puffs = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < puffs; i++) {
    const px = cx + (i - puffs / 2) * s * 0.55 + (rnd() - 0.5) * s * 0.2;
    const pr = s * (0.35 + rnd() * 0.3);
    d += `<circle cx="${px.toFixed(0)}" cy="${(cy + (rnd() - 0.5) * s * 0.25).toFixed(0)}" r="${pr.toFixed(0)}"/>`;
  }
  return `<g>${d}</g>`;
}

/**
 * STYLIZED dreamy look: a soft glow over the photo (the AI edit swaps the background when available),
 * with two layers of clouds drifting at different speeds, plus twinkles. No AI video.
 */
export const dreamy: EffectRenderer = async ({ base, width, height, opts, spec, extras }) => {
  const n = Math.round(spec.fps * spec.seconds);
  const th = THEMES[opts.theme] ?? THEMES.pastel;
  const k = Math.min(width, height) / 480;
  const density = [3, 5, 8][opts.level - 1]; // clouds frame the photo from the edges; they must never bury the subject
  const src = extras.edited ?? base;

  // Soft glow at partial opacity. (Screen-blending a bright copy over the photo at full strength blows out to white.)
  const glowRgba = await sharp(src).blur(10 * k + 0.5).modulate({ brightness: 1.1, saturation: 0.9 }).ensureAlpha().png().toBuffer();
  const glow = await sharp(glowRgba).linear([1, 1, 1, 0.4], [0, 0, 0, 0]).png().toBuffer();
  const tint = svg(width, height, `<rect width="${width}" height="${height}" fill="url(#g)"/>`,
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${th.top}"/><stop offset="1" stop-color="${th.bottom}"/></linearGradient>`);
  const dreamyBase = await sharp(src)
    .composite([{ input: glow }, { input: tint, blend: "soft-light" }])
    .modulate({ brightness: 1.04, saturation: 1.1 })
    .png()
    .toBuffer();

  // Each layer is one screen wide and tiled twice, so any whole number of cycles per loop is seamless.
  const makeLayer = async (seed: number, sizeMul: number, opacity: number, blur: number, yBands: [number, number][]) => {
    const rnd = rng(seed);
    // Draw every cloud three times (one screen left / centre / right) on a canvas THREE screens wide, blur it there,
    // then keep only the middle screen. Blurring on a canvas clipped to one screen darkens the edges and leaves a seam.
    let shapes = "";
    for (let i = 0; i < density; i++) {
      const [a, b] = yBands[i % yBands.length];
      const one = cloud(rnd() * width, (a + rnd() * (b - a)) * height, (36 + rnd() * 34) * k * sizeMul, rnd);
      for (const dx of [0, width, width * 2]) shapes += `<g transform="translate(${dx} 0)">${one}</g>`;
    }
    const wide = await sharp(
      svg(width * 3, height, `<g fill="${th.cloud}" opacity="${opacity}" filter="url(#b)">${shapes}</g>`,
        `<filter id="b" filterUnits="userSpaceOnUse" x="0" y="${-height * 0.2}" width="${width * 3}" height="${height * 1.4}"><feGaussianBlur stdDeviation="${blur * k}"/></filter>`),
    ).png().toBuffer();
    const one = await sharp(wide).extract({ left: width, top: 0, width, height }).png().toBuffer();
    return sharp({ create: { width: width * 2, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: one, left: 0, top: 0 }, { input: one, left: width, top: 0 }])
      .png()
      .toBuffer();
  };
  const far = await makeLayer(31, 0.8, 0.45, 5, [[0.0, 0.16], [0.84, 1.0]]);
  const near = await makeLayer(57, 1.1, 0.65, 6, [[0.88, 1.04], [-0.04, 0.08]]);

  const r = rng(77);
  const stars = Array.from({ length: 16 }, () => ({ x: r() * width, y: r() * height * 0.7, s: (2 + r() * 4) * k, ph: r() }));

  return {
    count: n,
    frame: async (i) => {
      const t = i / n;
      const f = await sharp(far).extract({ left: Math.round(t * width) % width, top: 0, width, height }).png({ compressionLevel: 1 }).toBuffer();
      const nr = await sharp(near).extract({ left: (width - (Math.round(t * width * 2) % width)) % width, top: 0, width, height }).png({ compressionLevel: 1 }).toBuffer();
      let sp = "";
      for (const s of stars) {
        const o = 0.5 + 0.5 * Math.sin(TAU * (t * 2 + s.ph));
        sp += `<circle cx="${s.x.toFixed(0)}" cy="${s.y.toFixed(0)}" r="${(s.s * (0.6 + 0.6 * o)).toFixed(1)}" fill="#fff" opacity="${(0.2 + 0.8 * o).toFixed(2)}"/>`;
      }
      return toPng(sharp(dreamyBase).composite([{ input: f }, { input: nr }, { input: svg(width, height, sp) }]));
    },
  };
};
