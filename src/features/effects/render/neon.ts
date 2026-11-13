import sharp from "sharp";
import { TAU, svg, toPng } from "./util";
import type { EffectRenderer } from "./types";

const COLORS: Record<string, string> = { pink: "#ff2bd6", cyan: "#19f2ff", purple: "#9b5cff", lime: "#b6ff3c" };
const STEPS = 6; // pre-rendered pulse levels keep per-frame work small

/** Darkened photo with a colour bloom, glowing edge lines, a neon frame and a light sweep. */
export const neon: EffectRenderer = async ({ base, width, height, opts, spec }) => {
  const n = Math.round(spec.fps * spec.seconds);
  const color = COLORS[opts.theme] ?? COLORS.pink;
  const k = Math.min(width, height) / 480;
  const strength = [0.75, 1, 1.3][opts.level - 1];

  const dark = await sharp(base).modulate({ brightness: 0.3, saturation: 1.4 }).png().toBuffer();

  const bloomBase = await sharp(base)
    .greyscale()
    .linear(4, -690) // keep only the very brightest highlights, so the glow does not fog the whole image
    .blur(9 * k + 0.3)
    .tint(color)
    .png()
    .toBuffer();

  const lap = { width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1], scale: 1, offset: 0 };
  const edge = await sharp(base)
    .toColourspace("b-w")
    .blur(0.8)
    .convolve(lap)
    .linear(5, 0)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const edgeCore = await sharp({ create: { width, height, channels: 3, background: color } })
    .joinChannel(edge.data, { raw: { width: edge.info.width, height: edge.info.height, channels: 1 } })
    .png()
    .toBuffer();
  const edgeGlow = await sharp(edgeCore).blur(4 * k + 0.3).png().toBuffer();

  const levels = await Promise.all(
    Array.from({ length: STEPS }, async (_, s) => {
      const f = 0.45 + (0.55 * s) / (STEPS - 1);
      return {
        bloom: await sharp(bloomBase).linear(Math.min(1, f * 0.55 * strength), 0).png().toBuffer(),
        glow: await sharp(edgeGlow).linear([1, 1, 1, Math.min(1, f * 1.8 * strength)], [0, 0, 0, 0]).png().toBuffer(),
        core: await sharp(edgeCore).linear([1, 1, 1, Math.min(1, f * 1.1)], [0, 0, 0, 0]).png().toBuffer(),
      };
    }),
  );

  const inset = Math.round(Math.min(width, height) * 0.045);
  const rx = Math.round(Math.min(width, height) * 0.05);
  const defs =
    `<filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${6 * k}"/></filter>` +
    `<linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;

  return {
    count: n,
    frame: async (i) => {
      const t = i / n;
      const pulse = 0.5 + 0.5 * Math.sin(TAU * t * 2);
      const lv = levels[Math.round(pulse * (STEPS - 1))];
      const flicker = 0.78 + 0.22 * Math.sin(TAU * t * 3 + 1);
      const sx = -0.3 * width + t * 1.6 * width;
      const frame =
        `<rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="${rx}" fill="none" stroke="${color}" stroke-width="${9 * k}" opacity="${(flicker * strength).toFixed(2)}" filter="url(#b)"/>` +
        `<rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="${rx}" fill="none" stroke="${color}" stroke-width="${3 * k}" opacity="${flicker.toFixed(2)}"/>` +
        `<rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="${rx}" fill="none" stroke="#fff" stroke-width="${1.2 * k}" opacity="${(flicker * 0.85).toFixed(2)}"/>` +
        `<g transform="translate(${sx.toFixed(1)} 0) skewX(-20)"><rect width="${width * 0.18}" height="${height}" fill="url(#s)"/></g>`;
      return toPng(
        sharp(dark).composite([
          { input: lv.bloom, blend: "screen" },
          { input: lv.glow },
          { input: lv.core },
          { input: svg(width, height, frame, defs) },
        ]),
      );
    },
  };
};
