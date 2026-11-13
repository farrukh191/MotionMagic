import sharp from "sharp";
import { TAU, rng, svg, toPng } from "./util";
import type { EffectRenderer } from "./types";

const THEMES: Record<string, { outer: [string, string]; inner: [string, string]; glow: string }> = {
  fire: { outer: ["#ff2d00", "#ff9a1a"], inner: ["#ffd23f", "#fffbe0"], glow: "#ff5a1f" },
  ice: { outer: ["#2f7bff", "#69d2ff"], inner: ["#c9f4ff", "#ffffff"], glow: "#4fb8ff" },
  toxic: { outer: ["#1fbf3b", "#8dff3b"], inner: ["#e4ff8a", "#ffffff"], glow: "#7dff2f" },
};
const FLAME = "M0 0 C-0.62 -0.35 -0.72 -1.1 0 -2.1 C0.72 -1.1 0.62 -0.35 0 0Z";

/**
 * Animated flame overlays placed on the eyes. Eye positions come from a vision AI model, then get range-checked.
 * Stylized overlay animation, not generated video.
 */
export const fire: EffectRenderer = async ({ base, width, height, opts, spec, extras }) => {
  const n = Math.round(spec.fps * spec.seconds);
  const th = THEMES[opts.theme] ?? THEMES.fire;
  const k = Math.min(width, height) / 480;
  const eyes = extras.eyes ?? { left: { x: 0.38, y: 0.44 }, right: { x: 0.62, y: 0.44 }, width: 0.13 };
  const nx = (opts.nudge?.x ?? 0) / 100;
  const ny = (opts.nudge?.y ?? 0) / 100;
  const pts = [eyes.left, eyes.right].map((p) => ({ x: (p.x + nx) * width, y: (p.y + ny) * height }));
  const ew = Math.max(10 * k, eyes.width * width);
  const intensity = [0.75, 1, 1.35][opts.level - 1];
  const tongues = [5, 7, 9][opts.level - 1];

  const dark = await sharp(base).modulate({ brightness: 0.78, saturation: 1.1 }).linear(1.12, -10).png().toBuffer();
  const r = rng(13);
  const flames = pts.map(() =>
    Array.from({ length: tongues }, (_, i) => ({
      ang: -90 + (i / (tongues - 1) - 0.5) * 120 + (r() - 0.5) * 14,
      len: 0.8 + r() * 0.7,
      cyc: r() < 0.5 ? 2 : 3,
      ph: r(),
      w: 0.8 + r() * 0.5,
    })),
  );
  const defs =
    `<linearGradient id="o" x1="0" y1="0" x2="0" y2="-1"><stop offset="0" stop-color="${th.outer[0]}"/><stop offset="1" stop-color="${th.outer[1]}"/></linearGradient>` +
    `<linearGradient id="i" x1="0" y1="0" x2="0" y2="-1"><stop offset="0" stop-color="${th.inner[0]}"/><stop offset="1" stop-color="${th.inner[1]}"/></linearGradient>` +
    `<radialGradient id="g"><stop offset="0" stop-color="${th.glow}" stop-opacity=".95"/><stop offset="1" stop-color="${th.glow}" stop-opacity="0"/></radialGradient>` +
    `<filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${1.4 * k}"/></filter>`;

  return {
    count: n,
    frame: async (i) => {
      const t = i / n;
      const pulse = 0.85 + 0.15 * Math.sin(TAU * t * 2);
      let glow = "";
      let fl = "";
      pts.forEach((p, e) => {
        glow += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(ew * 2.4 * pulse * intensity).toFixed(1)}" fill="url(#g)"/>`;
        for (const f of flames[e]) {
          const flick = 0.72 + 0.38 * Math.sin(TAU * (t * f.cyc + f.ph));
          const sway = 7 * Math.sin(TAU * (t * 2 + f.ph));
          const s = ew * 0.62 * f.len * flick * intensity;
          const g = `translate(${p.x.toFixed(1)} ${(p.y - ew * 0.1).toFixed(1)}) rotate(${(f.ang + 90 + sway).toFixed(1)})`;
          fl +=
            `<g transform="${g}" filter="url(#b)"><path d="${FLAME}" transform="scale(${(s * f.w).toFixed(1)} ${s.toFixed(1)})" fill="url(#o)"/>` +
            `<path d="${FLAME}" transform="scale(${(s * f.w * 0.5).toFixed(1)} ${(s * 0.62).toFixed(1)})" fill="url(#i)"/></g>`;
        }
        fl += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(ew * 0.3 * pulse).toFixed(1)}" fill="#fff6c8" opacity=".95"/>`;
      });
      const glowLayer = svg(width, height, glow, defs);
      const flameLayer = svg(width, height, fl, defs);
      return toPng(sharp(dark).composite([{ input: glowLayer, blend: "screen" }, { input: flameLayer }]));
    },
  };
};
