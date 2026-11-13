import sharp from "sharp";
import { FONT, TAU, cropZoom, easeOutBack, esc, smoothstep, svg, toPng } from "./util";
import type { EffectRenderer } from "./types";

const THEMES: Record<string, { burst: string; ray: string; ink: string }> = {
  classic: { burst: "#ffd23f", ray: "#ff3b30", ink: "#b3001b" },
  night: { burst: "#7df9ff", ray: "#7b2cff", ink: "#3a0ca3" },
  gold: { burst: "#fff1a8", ray: "#ff9f1c", ink: "#8a4b00" },
};
const SWITCH = 0.32; // the photo swaps to the hero version at the white-flash peak

/**
 * STYLIZED transformation: shake, white flash, comic burst, then the AI-made hero version punches in with "POW!".
 * The costume comes from the AI image edit; the motion is built in (no AI video).
 */
export const superhero: EffectRenderer = async ({ base, width, height, opts, spec, extras }) => {
  const n = Math.round(spec.fps * spec.seconds);
  const hero = extras.edited ?? base;
  const th = THEMES[opts.theme] ?? THEMES.classic;
  const k = Math.min(width, height) / 480;
  const power = [0.7, 1, 1.4][opts.level - 1];
  const name = (opts.text.trim() || "SUPER YOU").toUpperCase();
  const nameFs = Math.min(height * 0.085, (width * 0.9) / Math.max(4, name.length * 0.74));
  const cx = width / 2;
  const cy = height / 2;

  const rays = (rot: number, scale: number, alpha: number) => {
    let d = "";
    const count = 16;
    for (let i = 0; i < count; i += 2) {
      const a0 = rot + (i / count) * TAU;
      const a1 = rot + ((i + 1) / count) * TAU;
      const R = Math.max(width, height) * scale;
      d += `<path d="M${cx} ${cy} L${cx + Math.cos(a0) * R} ${cy + Math.sin(a0) * R} L${cx + Math.cos(a1) * R} ${cy + Math.sin(a1) * R}Z" fill="${th.ray}" opacity="${alpha}"/>`;
    }
    return d;
  };
  const starburst = (r1: number, r2: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU - Math.PI / 2;
      const rr = i % 2 ? r1 : r2;
      pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  return {
    count: n,
    frame: async (i) => {
      const t = i / n;
      const isHero = t >= SWITCH && t < 0.97;
      const src = isHero ? hero : base;

      let z = 1;
      let px = cx;
      let py = cy;
      if (t < SWITCH - 0.04) {
        const tension = smoothstep(0, SWITCH - 0.04, t); // growing shake before the transformation
        z = 1 + 0.03 * tension;
        px = cx + Math.sin(t * 160) * 3 * k * tension * power;
        py = cy + Math.cos(t * 190) * 3 * k * tension * power;
      } else if (isHero) {
        const punch = 1 - smoothstep(SWITCH, SWITCH + 0.22, t);
        z = 1 + 0.16 * punch * power;
      } else {
        z = 1.02;
      }
      const framed = await cropZoom(src, width, height, Math.max(1, z), px, py);

      const flash = Math.max(1 - smoothstep(0, 0.07, t), smoothstep(SWITCH - 0.06, SWITCH, t) * (1 - smoothstep(SWITCH, SWITCH + 0.07, t)), smoothstep(0.93, 0.99, t));
      const burstOn = smoothstep(SWITCH - 0.02, SWITCH + 0.04, t) * (1 - smoothstep(0.5, 0.62, t));
      let inner = "";
      if (burstOn > 0.01) inner += rays(t * 3, 0.9, 0.55 * burstOn);

      const pow = easeOutBack(smoothstep(SWITCH + 0.03, SWITCH + 0.14, t)) * (1 - smoothstep(0.62, 0.72, t));
      if (pow > 0.02) {
        const s = pow * (1 + 0.05 * Math.sin(TAU * t * 8));
        inner +=
          `<g transform="translate(${cx} ${height * 0.3}) rotate(-8) scale(${s.toFixed(3)})">` +
          `<polygon points="${starburst(52 * k, 86 * k)}" fill="${th.burst}" stroke="#111" stroke-width="${5 * k}" stroke-linejoin="round"/>` +
          `<text y="${15 * k}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${44 * k}" fill="${th.ink}" stroke="#fff" stroke-width="${2 * k}" paint-order="stroke">POW!</text></g>`;
      }
      const ban = smoothstep(0.52, 0.62, t) * (1 - smoothstep(0.9, 0.95, t));
      if (ban > 0.01) {
        inner +=
          `<g opacity="${ban.toFixed(2)}" transform="translate(0 ${((1 - ban) * 30 * k).toFixed(1)})">` +
          `<rect x="${width * 0.05}" y="${height - nameFs * 1.9}" width="${width * 0.9}" height="${nameFs * 1.5}" rx="${6 * k}" fill="${th.ray}" stroke="#111" stroke-width="${4 * k}" transform="skewX(-6)"/>` +
          `<text x="${cx}" y="${height - nameFs * 0.85}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${nameFs}" fill="#fff" stroke="#111" stroke-width="${nameFs * 0.12}" paint-order="stroke">${esc(name)}</text></g>`;
      }
      inner += `<rect x="${3 * k}" y="${3 * k}" width="${width - 6 * k}" height="${height - 6 * k}" fill="none" stroke="#111" stroke-width="${6 * k}"/>`;
      inner += `<rect width="${width}" height="${height}" fill="#fff" opacity="${flash.toFixed(2)}"/>`;
      return toPng(sharp(framed).composite([{ input: svg(width, height, inner) }]));
    },
  };
};
