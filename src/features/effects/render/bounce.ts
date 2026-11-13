import sharp from "sharp";
import { TAU, rng, svg, toPng } from "./util";
import type { EffectRenderer } from "./types";

const BACKGROUNDS: Record<string, [string, string]> = {
  sunny: ["#fff3b0", "#ffd166"],
  mint: ["#d8f3dc", "#95d5b2"],
  sky: ["#cfe8ff", "#8ecae6"],
  candy: ["#ffd6e8", "#c9b6ff"],
};

/**
 * Sticker-style card with squash-and-stretch bounce on a soft shadow.
 * The caller passes the (AI-)cartoonized image; the motion itself is built in.
 */
export const bounce: EffectRenderer = async ({ base, width, height, opts, spec }) => {
  const n = Math.round(spec.fps * spec.seconds);
  const [c1, c2] = BACKGROUNDS[opts.theme] ?? BACKGROUNDS.sunny;
  const k = Math.min(width, height) / 480;
  const level = [0.09, 0.13, 0.18][opts.level - 1];

  const sw = Math.round(width * 0.68);
  const sh = Math.round(height * 0.68);
  const radius = Math.round(Math.min(sw, sh) * 0.12);
  const card = await sharp(base)
    .resize(sw, sh, { fit: "fill", kernel: "lanczos3" })
    .composite([
      { input: svg(sw, sh, `<rect width="${sw}" height="${sh}" rx="${radius}" fill="#fff"/>`), blend: "dest-in" },
      {
        input: svg(sw, sh, `<rect x="${3 * k}" y="${3 * k}" width="${sw - 6 * k}" height="${sh - 6 * k}" rx="${radius}" fill="none" stroke="#fff" stroke-width="${6 * k}"/>`),
      },
    ])
    .png()
    .toBuffer();

  const r = rng(5);
  const dots = Array.from({ length: 26 }, () => ({ x: r() * width, y: r() * height, s: (2 + r() * 5) * k, o: 0.25 + r() * 0.35 }));
  const sparks = Array.from({ length: 7 }, () => ({ x: r() * width, y: r() * height * 0.8, s: (7 + r() * 8) * k, ph: r() }));
  const bg = await sharp(
    svg(
      width,
      height,
      `<rect width="${width}" height="${height}" fill="url(#g)"/>` + dots.map((d) => `<circle cx="${d.x.toFixed(0)}" cy="${d.y.toFixed(0)}" r="${d.s.toFixed(1)}" fill="#fff" opacity="${d.o.toFixed(2)}"/>`).join(""),
      `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`,
    ),
  )
    .png()
    .toBuffer();

  const ground = height * 0.93;
  const maxLift = height * level;
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

  return {
    count: n,
    frame: async (i) => {
      const t = i / n;
      const u = (t * 2) % 1; // two bounces per loop
      const air = 4 * u * (1 - u);
      const lift = air * maxLift;
      const contact = Math.max(0, 1 - Math.min(u, 1 - u) / 0.14);
      const sy = 1 - 0.17 * contact + 0.06 * air;
      const sx = 1 + 0.15 * contact - 0.04 * air;
      const w = Math.round(sw * sx);
      const h = Math.round(sh * sy);
      const angle = 4 * Math.sin(TAU * t * 2);

      const rotated = await sharp(card)
        .resize(w, h, { fit: "fill" })
        .rotate(angle, { background: transparent })
        .png({ compressionLevel: 1 })
        .toBuffer({ resolveWithObject: true });
      const left = Math.round(width / 2 - rotated.info.width / 2);
      const top = Math.round(ground - lift - h / 2 - rotated.info.height / 2);

      const shadowRx = sw * 0.42 * (1 - 0.35 * air);
      const shadow = `<ellipse cx="${width / 2}" cy="${ground + 4 * k}" rx="${shadowRx.toFixed(1)}" ry="${(9 * k * (1 - 0.3 * air)).toFixed(1)}" fill="#000" opacity="${(0.26 * (1 - 0.55 * air)).toFixed(2)}"/>`;
      const stars = sparks
        .map((s) => {
          const o = 0.5 + 0.5 * Math.sin(TAU * (t * 2 + s.ph));
          return `<path d="M${s.x.toFixed(0)} ${(s.y - s.s).toFixed(0)} L${(s.x + s.s * 0.3).toFixed(0)} ${(s.y - s.s * 0.3).toFixed(0)} L${(s.x + s.s).toFixed(0)} ${s.y.toFixed(0)} L${(s.x + s.s * 0.3).toFixed(0)} ${(s.y + s.s * 0.3).toFixed(0)} L${s.x.toFixed(0)} ${(s.y + s.s).toFixed(0)} L${(s.x - s.s * 0.3).toFixed(0)} ${(s.y + s.s * 0.3).toFixed(0)} L${(s.x - s.s).toFixed(0)} ${s.y.toFixed(0)} L${(s.x - s.s * 0.3).toFixed(0)} ${(s.y - s.s * 0.3).toFixed(0)}Z" fill="#fff" opacity="${(0.2 + 0.7 * o).toFixed(2)}"/>`;
        })
        .join("");

      return toPng(
        sharp(bg).composite([
          { input: svg(width, height, shadow + stars) },
          { input: rotated.data, left: Math.max(0, left), top: Math.max(0, top) },
        ]),
      );
    },
  };
};
