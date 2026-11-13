import sharp from "sharp";
import { FONT, TAU, esc, pick, rng, svg, toPng } from "./util";
import type { EffectRenderer } from "./types";

const PALETTES: Record<string, string[]> = {
  party: ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff924c"],
  pink: ["#ff5d8f", "#ff97b7", "#ffc2d4", "#fb6f92", "#ffffff", "#ffb3c6"],
  blue: ["#4cc9f0", "#4895ef", "#4361ee", "#3f37c9", "#a9d6e5", "#ffffff"],
};

/** Confetti rain, rising balloons and a bouncing "Happy Birthday" banner. */
export const birthday: EffectRenderer = async ({ base, width, height, opts, spec }) => {
  const n = Math.round(spec.fps * spec.seconds);
  const r = rng(21);
  const colors = PALETTES[opts.theme] ?? PALETTES.party;
  const k = Math.min(width, height) / 480;

  const confetti = Array.from({ length: [40, 70, 110][opts.level - 1] }, () => ({
    x: r(),
    size: (5 + r() * 7) * k,
    phase: r(),
    cycles: r() < 0.5 ? 1 : 2,
    amp: (6 + r() * 14) * k,
    sway: r(),
    spin: r() < 0.5 ? 1 : 2,
    flip: Math.floor(2 + r() * 3),
    color: pick(r, colors),
  }));

  const balloonCount = [4, 6, 8][opts.level - 1];
  const balloons = Array.from({ length: balloonCount }, (_, idx) => ({
    x: (idx + 0.5) / balloonCount + (r() - 0.5) * 0.06,
    size: (20 + r() * 14) * k,
    phase: r(),
    amp: (6 + r() * 10) * k,
    sway: r(),
    color: pick(r, colors),
  }));

  const name = opts.text.trim();
  const line1 = name ? "Happy Birthday" : "Happy Birthday!";
  const line2 = name ? `${name}!` : "";
  const fs1 = Math.min(width * 0.1, (width * 0.9) / (line1.length * 0.66));
  const fs2 = line2 ? Math.min(width * 0.13, (width * 0.9) / (line2.length * 0.68)) : 0;
  const bannerH = fs1 * 1.5 + fs2 * 1.3;

  const shade =
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.5"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;

  return {
    count: n,
    frame: async (i) => {
      const t = i / n;
      let inner = `<rect width="${width}" height="${Math.min(height, bannerH + 30 * k)}" fill="url(#g)"/>`;

      for (const b of balloons) {
        const p = (t + b.phase) % 1;
        const y = height + b.size * 3 - p * (height + b.size * 5);
        const x = b.x * width + Math.sin(TAU * (t + b.sway)) * b.amp;
        const s = b.size;
        const sway = Math.sin(TAU * (t * 2 + b.phase)) * s * 0.35;
        inner +=
          `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">` +
          `<path d="M0 ${s} Q${sway.toFixed(1)} ${s * 1.7} 0 ${s * 2.4}" stroke="#ffffff" stroke-opacity="0.8" stroke-width="${1.4 * k}" fill="none"/>` +
          `<ellipse rx="${s * 0.78}" ry="${s}" fill="${b.color}"/>` +
          `<path d="M${-3.5 * k} ${s} L${3.5 * k} ${s} L0 ${s + 6 * k}Z" fill="${b.color}"/>` +
          `<ellipse cx="${-s * 0.28}" cy="${-s * 0.35}" rx="${s * 0.16}" ry="${s * 0.28}" fill="#fff" opacity="0.45" transform="rotate(20 ${-s * 0.28} ${-s * 0.35})"/></g>`;
      }

      for (const c of confetti) {
        const p = (t * c.cycles + c.phase) % 1;
        const y = -c.size * 2 + p * (height + c.size * 4);
        const x = c.x * width + Math.sin(TAU * (t * c.cycles + c.sway)) * c.amp;
        const rot = 360 * (t * c.spin + c.phase);
        const flip = Math.cos(TAU * (t * c.flip + c.phase));
        inner += `<rect x="${(-c.size / 2).toFixed(1)}" y="${(-c.size / 4).toFixed(1)}" width="${c.size.toFixed(1)}" height="${(c.size / 2).toFixed(1)}" fill="${c.color}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(1 ${flip.toFixed(2)})"/>`;
      }

      const bounce = 1 + 0.05 * Math.sin(TAU * t * 2);
      const cx = width / 2;
      const y1 = fs1 * 1.15;
      const y2 = y1 + fs2 * 1.15;
      const text = (str: string, y: number, size: number, fill: string) =>
        `<text x="${cx}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${size}" fill="none" stroke="#2b0a3d" stroke-width="${size * 0.2}" stroke-linejoin="round">${esc(str)}</text>` +
        `<text x="${cx}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${size}" fill="${fill}">${esc(str)}</text>`;
      inner +=
        `<g transform="translate(${cx} ${bannerH / 2}) scale(${bounce.toFixed(3)}) translate(${-cx} ${-bannerH / 2})">` +
        text(line1, y1, fs1, "#ffd23f") +
        (line2 ? text(line2, y2, fs2, "#ffffff") : "") +
        `</g>`;

      return toPng(sharp(base).composite([{ input: svg(width, height, inner, shade) }]));
    },
  };
};
