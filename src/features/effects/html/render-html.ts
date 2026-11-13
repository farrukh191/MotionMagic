import sharp from "sharp";
import { framesToGif, type EncodedGif } from "../render/frames";
import { watermarkOverlay } from "../render/watermark";
import type { RenderSpec } from "../render/types";
import { getBrowser, htmlLimiter } from "./browser";
import { DesignError } from "./sanitize";

export const LOOP_MS = 4000;
const RENDER_TIMEOUT_MS = 60_000;

/** Wraps an already-sanitized design around the photo. Sizes use --u (1% of the shorter side). */
function buildDocument(design: string, photoPng: Buffer, w: number, h: number): string {
  const u = Math.min(w, h) / 100;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<style>
html,body{margin:0;background:#000}
#stage{position:relative;width:${w}px;height:${h}px;overflow:hidden;--u:${u}px;font-family:"DejaVu Sans","Noto Color Emoji",sans-serif}
#photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#fx{position:absolute;inset:0;overflow:hidden}
#fx *,#fx *::before,#fx *::after{animation-iteration-count:infinite !important}
</style></head><body><div id="stage"><img id="photo" alt="" src="data:image/png;base64,${photoPng.toString("base64")}"><div id="fx">${design}</div></div></body></html>`;
}

/** In-page scripts are plain strings so compilers cannot inject helpers into them. */
export const NORMALIZE_SCRIPT = (loopMs: number) => `(() => {
  const loopMs = ${loopMs};
  const choices = [loopMs / 8, loopMs / 4, loopMs / 2, loopMs];
  const anims = document.getAnimations();
  for (const a of anims) {
    const eff = a.effect;
    if (!eff) continue;
    const t = eff.getTiming();
    const d = typeof t.duration === "number" && t.duration > 0 ? t.duration : loopMs;
    const c = choices.reduce((best, x) => (Math.abs(Math.log(d / x)) < Math.abs(Math.log(d / best)) ? x : best));
    const delay = (((t.delay || 0) % c) + c) % c;
    eff.updateTiming({ duration: c, iterations: Infinity, delay: delay === 0 ? 0 : delay - c, endDelay: 0, fill: "both" });
    a.pause();
  }
  return anims.length;
})()`;

export const SEEK_SCRIPT = (ms: number) =>
  `(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ${ms}; } return 0; })()`;

/** Renders a sanitized design over the photo into a looping GIF. */
export async function renderDesignGif(
  design: string,
  image: Buffer,
  spec: RenderSpec,
  maxBytes = spec.preview ? 1.5 * 1024 * 1024 : 5 * 1024 * 1024,
): Promise<EncodedGif & { animations: number }> {
  const { data: photo, info } = await sharp(image)
    .resize(spec.maxSize, spec.maxSize, { fit: "inside" })
    .flatten({ background: "#fff" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = Math.round(spec.fps * spec.seconds);
  const mark = spec.preview ? await watermarkOverlay(w, h) : null;

  return htmlLimiter(async () => {
    const ctx = await (await getBrowser()).newContext({ viewport: { width: w, height: h }, javaScriptEnabled: false });
    const timer = setTimeout(() => ctx.close().catch(() => null), RENDER_TIMEOUT_MS);
    try {
      const page = await ctx.newPage();
      await page.setContent(buildDocument(design, photo, w, h), { waitUntil: "load" });
      await page.evaluate("document.fonts.ready.then(() => 0)");
      const animations = (await page.evaluate(NORMALIZE_SCRIPT(LOOP_MS))) as number;
      if (animations === 0) throw new DesignError("The design has no animation.");

      const gif = await framesToGif(
        {
          count: n,
          frame: async (i) => {
            await page.evaluate(SEEK_SCRIPT((i / n) * LOOP_MS));
            const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: w, height: h } });
            return mark ? sharp(png).composite([{ input: mark }]).png({ compressionLevel: 1 }).toBuffer() : png;
          },
        },
        spec.fps,
        maxBytes,
        info,
      );
      return { ...gif, animations };
    } finally {
      clearTimeout(timer);
      await ctx.close().catch(() => null);
    }
  });
}
