import sharp from "sharp";
import { framesToGif, type EncodedGif } from "@/features/effects/render/frames";
import { watermarkOverlay } from "@/features/effects/render/watermark";
import type { RenderSpec } from "@/features/effects/render/types";
import { getBrowser, htmlLimiter } from "@/features/effects/html/browser";
import { NORMALIZE_SCRIPT, SEEK_SCRIPT } from "@/features/effects/html/render-html";
import { DesignError } from "@/features/effects/html/sanitize";
import { buildBusinessDocument, type BizImage, type BizInputs } from "./build";
import { bizDimensions, normalizeBizOptions, type BizTemplate } from "./meta";

const RENDER_TIMEOUT_MS = 90_000;

/** Prepares a customer image for embedding. Pixels are only scaled down, never recoloured or redrawn. */
export async function toBizImage(png: Buffer, maxSide = 900): Promise<BizImage> {
  const { data, info } = await sharp(png).resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
  let transparent = false;
  if (info.channels === 4) {
    const stats = await sharp(data).stats();
    transparent = (stats.channels[3]?.min ?? 255) < 250;
  }
  return { dataUri: `data:image/png;base64,${data.toString("base64")}`, transparent, width: info.width, height: info.height };
}

/**
 * Renders one business template to a looping GIF with the same Chromium engine as AI designs.
 * The HTML is built by our own templates from escaped text and embedded images: no AI, no scripts.
 */
export async function renderBusinessGif(
  t: BizTemplate,
  rawOptions: unknown,
  inputs: BizInputs,
  spec: RenderSpec,
  maxBytes = spec.preview ? 1.5 * 1024 * 1024 : 5 * 1024 * 1024,
): Promise<EncodedGif & { animations: number }> {
  const opts = normalizeBizOptions(t, rawOptions);
  const { w, h } = bizDimensions(opts.size, spec.maxSize);
  const html = buildBusinessDocument(t, opts, inputs, w, h);
  return renderDocumentGif(html, w, h, t.seconds, spec, maxBytes);
}

/**
 * Renders any complete, trusted HTML document (our own templates, customer text already escaped) to a looping GIF.
 * JavaScript is off; animations are normalized to the loop length and frames are taken by seeking, so it is deterministic.
 */
export async function renderDocumentGif(
  html: string,
  w: number,
  h: number,
  seconds: number,
  spec: RenderSpec,
  maxBytes = spec.preview ? 1.5 * 1024 * 1024 : 5 * 1024 * 1024,
): Promise<EncodedGif & { animations: number }> {
  const loopMs = seconds * 1000;
  const n = Math.round(spec.fps * seconds);
  const mark = spec.preview ? await watermarkOverlay(w, h) : null;

  return htmlLimiter(async () => {
    const ctx = await (await getBrowser()).newContext({ viewport: { width: w, height: h }, javaScriptEnabled: false });
    const timer = setTimeout(() => ctx.close().catch(() => null), RENDER_TIMEOUT_MS);
    try {
      const page = await ctx.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate("document.fonts.ready.then(() => 0)");
      const animations = (await page.evaluate(NORMALIZE_SCRIPT(loopMs))) as number;
      if (animations === 0) throw new DesignError("The template has no animation.");
      const gif = await framesToGif(
        {
          count: n,
          frame: async (i) => {
            await page.evaluate(SEEK_SCRIPT((i / n) * loopMs));
            const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: w, height: h } });
            return mark ? sharp(png).composite([{ input: mark }]).png({ compressionLevel: 1 }).toBuffer() : png;
          },
        },
        spec.fps,
        maxBytes,
        { width: w, height: h },
      );
      return { ...gif, animations };
    } finally {
      clearTimeout(timer);
      await ctx.close().catch(() => null);
    }
  });
}
