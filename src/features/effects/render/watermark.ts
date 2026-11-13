import sharp from "sharp";
import { FONT, svg } from "./util";

/** Diagonal "PREVIEW" mark baked into free previews so they are not a substitute for the paid file. */
export async function watermarkOverlay(width: number, height: number): Promise<Buffer> {
  const fs = Math.max(11, Math.round(Math.min(width, height) * 0.062));
  const mark = (y: number) =>
    `<text x="${width / 2}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${fs}" ` +
    `fill="#fff" fill-opacity="0.55" stroke="#000" stroke-opacity="0.35" stroke-width="${fs * 0.06}">PREVIEW · MotionMagic</text>`;
  const inner = `<g transform="rotate(-24 ${width / 2} ${height / 2})">${mark(height * 0.35)}${mark(height * 0.62)}${mark(height * 0.9)}</g>`;
  return sharp(svg(width, height, inner)).png().toBuffer();
}
