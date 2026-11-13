import sharp from "sharp";
import { TAU, rng, svg, toPng } from "./util";
import type { EffectRenderer } from "./types";

const THEMES: Record<string, { bg: [string, string]; beam: string[] }> = {
  disco: { bg: ["#2b0f5e", "#12062e"], beam: ["#ff4fd8", "#4fd8ff", "#ffe14f"] },
  sunset: { bg: ["#ff7a59", "#7a1f5c"], beam: ["#ffd166", "#ff8fab", "#fff"] },
  fresh: { bg: ["#0b6e6e", "#06262e"], beam: ["#7dffb3", "#7de1ff", "#fff59d"] },
};
const NOTE = "M0 0 C-4 -1 -6 3 -2 5 C1 6 4 4 3 0 L3 -12 L9 -10 L9 -14 L1 -16Z";

/**
 * STYLIZED dance: your photo becomes a sticker that hops, sways and spins in time with a beat, with disco lights
 * and music notes. This is NOT realistic body motion; no AI video is used.
 */
export const dance: EffectRenderer = async ({ base, width, height, opts, spec }) => {
  const n = Math.round(spec.fps * spec.seconds);
  const th = THEMES[opts.theme] ?? THEMES.disco;
  const k = Math.min(width, height) / 480;
  const energy = [0.7, 1, 1.35][opts.level - 1];
  const sw = Math.round(width * 0.62);
  const sh = Math.round(height * 0.62);
  const rad = Math.round(Math.min(sw, sh) * 0.14);
  const card = await sharp(base)
    .resize(sw, sh, { fit: "cover" })
    .composite([
      { input: svg(sw, sh, `<rect width="${sw}" height="${sh}" rx="${rad}" fill="#fff"/>`), blend: "dest-in" },
      { input: svg(sw, sh, `<rect x="${3 * k}" y="${3 * k}" width="${sw - 6 * k}" height="${sh - 6 * k}" rx="${rad}" fill="none" stroke="#fff" stroke-width="${6 * k}"/>`) },
    ])
    .png()
    .toBuffer();

  const bg = await sharp(
    svg(
      width, height,
      `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
        Array.from({ length: 8 }, (_, i) => `<path d="M0 ${height * 0.78 + i * 14 * k} H${width}" stroke="#fff" stroke-opacity=".07" stroke-width="${2 * k}"/>`).join(""),
      `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${th.bg[0]}"/><stop offset="1" stop-color="${th.bg[1]}"/></linearGradient>`,
    ),
  ).png().toBuffer();

  const r = rng(4);
  const notes = Array.from({ length: 7 }, () => ({ x: 0.08 + r() * 0.84, ph: r(), s: (0.7 + r() * 0.6) * k, c: th.beam[Math.floor(r() * 3)] }));
  const ground = height * 0.9;
  const T = { r: 0, g: 0, b: 0, alpha: 0 };

  return {
    count: n,
    frame: async (i) => {
      const t = i / n;
      const beat = Math.abs(Math.sin(TAU * t * 2)); // 4 hops per loop
      const hop = beat * height * 0.09 * energy;
      const landing = Math.max(0, 1 - Math.min(beat, 1) * 6) * (1 - beat);
      const sy = 1 - 0.12 * landing * energy + 0.05 * beat;
      const sx = 1 + 0.1 * landing * energy - 0.03 * beat;
      const angle = 11 * energy * Math.sin(TAU * t * 2 + 0.6);
      const cx = width / 2 + Math.sin(TAU * t) * width * 0.07 * energy;
      const w = Math.round(sw * sx);
      const h = Math.round(sh * sy);

      let beams = "";
      for (let b = 0; b < 3; b++) {
        const a = TAU * (t + b / 3);
        const x2 = width / 2 + Math.cos(a) * width, y2 = -height * 0.2 + Math.abs(Math.sin(a)) * height * 1.3;
        beams += `<path d="M${width * (0.2 + 0.3 * b)} ${-10} L${x2 - 40 * k} ${y2} L${x2 + 40 * k} ${y2}Z" fill="${th.beam[b]}" opacity="${(0.16 + 0.1 * Math.sin(TAU * (t * 2 + b / 3))).toFixed(2)}"/>`;
      }
      let ns = "";
      for (const nt of notes) {
        const p = (t + nt.ph) % 1;
        ns += `<path d="${NOTE}" transform="translate(${(nt.x * width + Math.sin(TAU * (t * 2 + nt.ph)) * 14 * k).toFixed(0)} ${(height * 0.95 - p * height * 0.95).toFixed(0)}) scale(${nt.s.toFixed(2)})" fill="${nt.c}" opacity="${(Math.min(1, p * 5, (1 - p) * 3) * 0.9).toFixed(2)}"/>`;
      }
      const shadow = `<ellipse cx="${cx.toFixed(0)}" cy="${(ground + 4 * k).toFixed(0)}" rx="${(sw * 0.4 * (1 - 0.3 * beat)).toFixed(0)}" ry="${(8 * k).toFixed(1)}" fill="#000" opacity="${(0.35 * (1 - 0.5 * beat)).toFixed(2)}"/>`;

      const rot = await sharp(card).resize(w, h, { fit: "fill" }).rotate(angle, { background: T }).png({ compressionLevel: 1 }).toBuffer({ resolveWithObject: true });
      const left = Math.round(cx - rot.info.width / 2);
      const top = Math.round(ground - hop - h / 2 - rot.info.height / 2);
      return toPng(
        sharp(bg).composite([
          { input: svg(width, height, beams + shadow + ns) },
          { input: rot.data, left: Math.max(0, left), top: Math.max(0, top) },
        ]),
      );
    },
  };
};
