import sharp from "sharp";
import { TAU, cropZoom, rng, smoothstep, svg, toPng } from "./util";
import type { EffectRenderer } from "./types";

const COLORS: Record<string, string[]> = {
  gold: ["#ffe27a", "#fff3b0", "#ffc83d"],
  pink: ["#ff9ecb", "#ffd1e8", "#ff6fae"],
  blue: ["#9ad9ff", "#d6f1ff", "#5cc0ff"],
};
const STEPS = 12;
const star = (x: number, y: number, s: number) =>
  `M${x} ${y - s}L${x + s * 0.28} ${y - s * 0.28}L${x + s} ${y}L${x + s * 0.28} ${y + s * 0.28}L${x} ${y + s}L${x - s * 0.28} ${y + s * 0.28}L${x - s} ${y}L${x - s * 0.28} ${y - s * 0.28}Z`;

/**
 * STYLIZED reveal: the AI-edited (smiling) photo fades in over the original with a soft zoom and sparkles.
 * The smile itself comes from the AI image edit; the motion is a built-in crossfade, not generated video.
 */
export const smile: EffectRenderer = async ({ base, width, height, opts, spec, extras }) => {
  const n = Math.round(spec.fps * spec.seconds);
  const edited = extras.edited ?? base;
  const colors = COLORS[opts.theme] ?? COLORS.gold;
  const k = Math.min(width, height) / 480;
  const zoomAmt = [0.03, 0.06, 0.09][opts.level - 1];
  const r = rng(9);
  const sparks = Array.from({ length: [10, 16, 24][opts.level - 1] }, () => ({
    a: r() * TAU, d: 0.18 + r() * 0.32, s: (5 + r() * 9) * k, ph: r(), c: colors[Math.floor(r() * colors.length)],
  }));

  const rgba = await sharp(edited).ensureAlpha().png().toBuffer(); // alpha must exist BEFORE linear() scales it
  const layers = await Promise.all(
    Array.from({ length: STEPS }, (_, i) => sharp(rgba).linear([1, 1, 1, i / (STEPS - 1)], [0, 0, 0, 0]).png().toBuffer()),
  );

  return {
    count: n,
    frame: async (i) => {
      const t = i / n;
      const w = smoothstep(0.12, 0.38, t) * (1 - smoothstep(0.78, 0.94, t));
      const blended = await toPng(sharp(base).composite([{ input: layers[Math.round(w * (STEPS - 1))] }]));
      const z = 1 + zoomAmt * w;
      const framed = await cropZoom(blended, width, height, z, width / 2, height * 0.46);

      const burst = smoothstep(0.14, 0.4, t) * (1 - smoothstep(0.4, 0.62, t));
      let inner = "";
      for (const s of sparks) {
        const twinkle = 0.5 + 0.5 * Math.sin(TAU * (t * 2 + s.ph));
        const radius = s.d * (0.4 + 0.9 * burst) * Math.min(width, height);
        const x = width / 2 + Math.cos(s.a) * radius * 1.25;
        const y = height * 0.46 + Math.sin(s.a) * radius;
        const op = (0.15 + 0.85 * Math.max(burst, w * 0.6 * twinkle)).toFixed(2);
        inner += `<path d="${star(Math.round(x), Math.round(y), s.s * (0.6 + 0.8 * twinkle))}" fill="${s.c}" opacity="${op}"/>`;
      }
      return toPng(sharp(framed).composite([{ input: svg(width, height, inner) }]));
    },
  };
};
