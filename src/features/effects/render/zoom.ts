import sharp from "sharp";
import { FONT, TAU, esc, svg, toPng } from "./util";
import type { EffectRenderer } from "./types";

type Grade = (s: sharp.Sharp) => sharp.Sharp;
const GRADES: Record<string, Grade> = {
  warm: (s) => s.recomb([[1.1, 0.04, 0], [0, 1.0, 0], [0, 0, 0.86]]).modulate({ saturation: 1.1 }),
  cool: (s) => s.recomb([[0.9, 0, 0], [0, 1.0, 0.04], [0, 0, 1.15]]).modulate({ saturation: 1.05 }),
  noir: (s) => s.greyscale().linear(1.25, -22),
};

/** Slow push-in and pull-out (Ken Burns) with film grade, vignette and letterbox bars. */
export const zoom: EffectRenderer = async ({ base, width, height, opts, spec }) => {
  const n = Math.round(spec.fps * spec.seconds);
  const amp = [0.14, 0.24, 0.36][opts.level - 1];
  const UP = 1.4; // work from an upscaled source so the zoom stays sharp
  const src = await (GRADES[opts.theme] ?? GRADES.warm)(sharp(base).resize(Math.round(width * UP), Math.round(height * UP), { fit: "fill", kernel: "lanczos3" }))
    .png()
    .toBuffer();
  const sw = Math.round(width * UP);
  const sh = Math.round(height * UP);

  const bar = Math.round(height * 0.1);
  const overlay = await sharp(
    svg(
      width,
      height,
      `<rect width="${width}" height="${height}" fill="url(#v)"/>` +
        `<rect width="${width}" height="${bar}" fill="#000"/><rect y="${height - bar}" width="${width}" height="${bar}" fill="#000"/>`,
      `<radialGradient id="v" cx="50%" cy="50%" r="75%"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>`,
    ),
  )
    .png()
    .toBuffer();

  const title = opts.text.trim().toUpperCase();
  const fs = Math.min(height * 0.05, (width * 0.85) / Math.max(1, title.length * 0.8));

  return {
    count: n,
    frame: async (i) => {
      const t = i / n;
      const ease = (1 - Math.cos(TAU * t)) / 2; // 0 -> 1 -> 0: seamless loop
      const z = 1 + amp * ease;
      const w0 = width / z;
      const h0 = height / z;
      const cx = width / 2 + 0.35 * (width - w0) * Math.sin(TAU * t);
      const cy = height / 2 + 0.25 * (height - h0) * Math.cos(TAU * t * 1) * -1;
      const left = Math.max(0, Math.min(sw - 2, Math.round((cx - w0 / 2) * UP)));
      const top = Math.max(0, Math.min(sh - 2, Math.round((cy - h0 / 2) * UP)));
      const cw = Math.min(sw - left, Math.round(w0 * UP));
      const ch = Math.min(sh - top, Math.round(h0 * UP));
      const frame = await sharp(src)
        .extract({ left, top, width: cw, height: ch })
        .resize(width, height, { fit: "fill", kernel: "lanczos3" })
        .png({ compressionLevel: 1 })
        .toBuffer();

      const layers: sharp.OverlayOptions[] = [{ input: overlay }];
      if (title) {
        const a = Math.max(0, Math.min(1, Math.sin(Math.PI * t) * 2.2));
        layers.push({
          input: svg(
            width,
            height,
            `<text x="${width / 2}" y="${height - bar / 2 + fs * 0.35}" text-anchor="middle" font-family="${FONT}" font-size="${fs}" letter-spacing="${fs * 0.18}" fill="#f5f0e6" fill-opacity="${a.toFixed(2)}">${esc(title)}</text>`,
          ),
        });
      }
      return toPng(sharp(frame).composite(layers));
    },
  };
};
