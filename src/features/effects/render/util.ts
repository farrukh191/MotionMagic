import sharp from "sharp";

export const TAU = Math.PI * 2;

/** Small seeded RNG so previews and final renders look identical. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function svg(width: number, height: number, inner: string, defs = ""): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defs}</defs>${inner}</svg>`,
  );
}

export const FONT = "DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";

/** Fast PNG encode: frames are temporary, so favour speed over size. */
export function toPng(s: sharp.Sharp): Promise<Buffer> {
  return s.png({ compressionLevel: 1 }).toBuffer();
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smoothstep = (a: number, b: number, v: number) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
export const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** Crops a zoomed window out of a PNG (centre cx,cy in output pixels, zoom z >= 1) and scales back to W x H. */
export async function cropZoom(src: Buffer, W: number, H: number, z: number, cx: number, cy: number): Promise<Buffer> {
  const w0 = W / z;
  const h0 = H / z;
  const left = Math.max(0, Math.min(W - 2, Math.round(cx - w0 / 2)));
  const top = Math.max(0, Math.min(H - 2, Math.round(cy - h0 / 2)));
  return sharp(src)
    .extract({ left, top, width: Math.min(W - left, Math.round(w0)), height: Math.min(H - top, Math.round(h0)) })
    .resize(W, H, { fit: "fill", kernel: "lanczos3" })
    .png({ compressionLevel: 1 })
    .toBuffer();
}
