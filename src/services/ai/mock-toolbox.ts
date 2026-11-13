import sharp from "sharp";
import { PRESETS, presetForPrompt } from "@/features/effects/html/presets";
import type { AiCtx, AiToolbox, EditKind, Eyes, Usage } from "./types";

const mockUsage = (step: Usage["step"], images = 0): Usage => ({
  provider: "mock", model: `mock-${step}`, step, inputTokens: 0, outputTokens: 0, images, costUsd: 0, notionalCostUsd: 0,
});

/** Free, offline stand-in for "cartoonize": smooth, flatten colours, add outlines. */
export async function mockCartoonize(image: Buffer): Promise<Buffer> {
  const lap = { width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1], scale: 1, offset: 0 };
  const smooth = await sharp(image).median(5).modulate({ saturation: 1.5, brightness: 1.05 }).png().toBuffer();
  const flat = await sharp(smooth).png({ palette: true, colours: 18, dither: 0 }).toBuffer();
  const { data, info } = await sharp(image).toColourspace("b-w").median(3).convolve(lap).threshold(34).negate().raw().toBuffer({ resolveWithObject: true });
  const lines = await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } }).toColourspace("srgb").png().toBuffer();
  return sharp(flat).composite([{ input: lines, blend: "multiply" }]).png().toBuffer();
}

/** Visible-but-fake edits so the full pipeline can be tested with no AI. They do NOT change expressions or backgrounds. */
async function mockEdit(image: Buffer, kind: EditKind): Promise<Buffer> {
  const { width = 512, height = 512 } = await sharp(image).metadata();
  switch (kind) {
    case "cartoon":
      return mockCartoonize(image);
    case "smile":
      return sharp(image).modulate({ brightness: 1.07, saturation: 1.2 }).sharpen().png().toBuffer();
    case "superhero": {
      const comic = await sharp(image).modulate({ saturation: 1.9, brightness: 1.05 }).linear(1.25, -25).png({ palette: true, colours: 14, dither: 0 }).toBuffer();
      const cape = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e63946" stop-opacity="0"/><stop offset="1" stop-color="#e63946" stop-opacity=".55"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
      return sharp(comic).composite([{ input: cape }]).png().toBuffer();
    }
    case "dreamy": {
      // Pastel soft-light sky tint only. (Screen-blending a bright copy blows the image out to white.)
      const sky = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff"/><stop offset="1" stop-color="#ffd6ec"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
      return sharp(image).composite([{ input: sky, blend: "soft-light" }]).png().toBuffer();
    }
  }
}

export const mockToolbox: AiToolbox = {
  async designAnimation(prompt, ctx: AiCtx) {
    await ctx.log(mockUsage("design"), true);
    const preset = presetForPrompt(prompt);
    const title = prompt.split(/[.,!\n]/)[0].trim().slice(0, 24) || "Celebrate!";
    return { html: preset.build(title), title: preset.label };
  },
  async detectEyes(_image, ctx: AiCtx): Promise<Eyes> {
    await ctx.log(mockUsage("eyes"), true);
    return { left: { x: 0.38, y: 0.44 }, right: { x: 0.62, y: 0.44 }, width: 0.13 };
  },
  async editImage(image, kind, ctx: AiCtx) {
    const out = await mockEdit(image, kind);
    await ctx.log(mockUsage("image-edit", 1), true);
    return { image: out };
  },
};

export { PRESETS };
