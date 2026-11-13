import sharp from "sharp";
import { TAU, pick, rng, svg, toPng } from "./util";
import type { EffectRenderer } from "./types";

const PALETTES: Record<string, string[]> = {
  classic: ["#ff2d55", "#ff5c8a", "#ff8fb1", "#e0115f", "#ffffff"],
  pastel: ["#ffc2d4", "#ffd6e8", "#ffe3f1", "#e8c7ff", "#fff0f6"],
  sunset: ["#ff6b6b", "#ffa94d", "#ffd43b", "#f06595", "#cc5de8"],
};

const HEART = "M0 0.95 C-1.5 -0.05 -0.95 -1.15 0 -0.42 C0.95 -1.15 1.5 -0.05 0 0.95Z";

/** Hearts float up the frame. Every motion is periodic, so the GIF loops with no jump. */
export const hearts: EffectRenderer = async ({ base, width, height, opts, spec }) => {
  const n = Math.round(spec.fps * spec.seconds);
  const r = rng(7);
  const palette = PALETTES[opts.theme] ?? PALETTES.classic;
  const count = [14, 24, 38][opts.level - 1];
  const k = Math.min(width, height) / 480;

  const items = Array.from({ length: count }, () => ({
    x: r(),
    size: (8 + r() * 22) * k,
    phase: r(),
    cycles: r() < 0.6 ? 1 : 2,
    amp: (8 + r() * 26) * k,
    sway: r(),
    color: pick(r, palette),
    rot: Math.round((r() - 0.5) * 50),
    alpha: 0.6 + r() * 0.4,
  }));

  return {
    count: n,
    frame: async (i) => {
      const t = i / n;
      let inner = "";
      for (const it of items) {
        const p = (t * it.cycles + it.phase) % 1;
        const y = height + it.size * 2 - p * (height + it.size * 4);
        const x = it.x * width + Math.sin(TAU * (t * it.cycles + it.sway)) * it.amp;
        const a = Math.min(1, p * 5, (1 - p) * 2.5) * it.alpha;
        const s = it.size * (1 + 0.1 * Math.sin(TAU * (t * 2 + it.phase)));
        inner +=
          `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${it.rot}) scale(${s.toFixed(1)})" opacity="${a.toFixed(2)}">` +
          `<path d="${HEART}" fill="${it.color}"/>` +
          `<ellipse cx="-0.5" cy="-0.5" rx="0.24" ry="0.12" fill="#fff" opacity="0.6" transform="rotate(-35 -0.5 -0.5)"/></g>`;
      }
      return toPng(sharp(base).composite([{ input: svg(width, height, inner) }]));
    },
  };
};
