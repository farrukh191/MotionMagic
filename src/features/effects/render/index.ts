import sharp from "sharp";
import { birthday } from "./birthday";
import { dance } from "./dance";
import { dreamy } from "./dreamy";
import { fire } from "./fire";
import { smile } from "./smile";
import { superhero } from "./superhero";
import { bounce } from "./bounce";
import { framesToGif, type EncodedGif } from "./frames";
import { hearts } from "./hearts";
import { neon } from "./neon";
import type { EffectRenderer, RenderExtras, RenderOptions, RenderSpec } from "./types";
import { watermarkOverlay } from "./watermark";
import { zoom } from "./zoom";

export type { RenderExtras, RenderOptions, RenderSpec, Eyes } from "./types";

const RENDERERS: Record<string, EffectRenderer> = {
  "flying-hearts": hearts,
  "birthday-celebration": birthday,
  "cinematic-zoom": zoom,
  "neon-glow": neon,
  "cartoon-bounce": bounce,
  "magic-smile": smile,
  "funny-dance": dance,
  "superhero-transformation": superhero,
  "fire-eyes": fire,
  "dreamy-clouds": dreamy,
};

/** Paid, full-quality output. */
export const FINAL_SPEC = { maxSize: 480, fps: 12, preview: false } as const;
/** Free, small, watermarked preview. */
export const PREVIEW_SPEC = { maxSize: 288, fps: 10, preview: true } as const;

export function hasRenderer(slug: string): boolean {
  return slug in RENDERERS;
}

/** Renders one built-in effect into an optimized, looping GIF. */
export async function renderEffect(
  slug: string,
  image: Buffer,
  opts: RenderOptions,
  spec: RenderSpec,
  extras: RenderExtras = {},
  maxBytes = spec.preview ? 1.5 * 1024 * 1024 : 5 * 1024 * 1024,
): Promise<EncodedGif> {
  const renderer = RENDERERS[slug];
  if (!renderer) throw new Error(`No renderer for effect "${slug}"`);

  const { data: base, info } = await sharp(image)
    .resize(spec.maxSize, spec.maxSize, { fit: "inside", withoutEnlargement: false })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer({ resolveWithObject: true });

  // The AI-edited photo must match the working size exactly so crossfades line up.
  const edited = extras.edited
    ? await sharp(extras.edited).resize(info.width, info.height, { fit: "cover" }).flatten({ background: "#ffffff" }).png().toBuffer()
    : undefined;
  const source = await renderer({ base, width: info.width, height: info.height, opts, spec, extras: { ...extras, edited } });
  if (!spec.preview) return framesToGif(source, spec.fps, maxBytes, info);

  const mark = await watermarkOverlay(info.width, info.height);
  return framesToGif(
    {
      count: source.count,
      frame: async (i) => sharp(await source.frame(i)).composite([{ input: mark }]).png({ compressionLevel: 1 }).toBuffer(),
    },
    spec.fps,
    maxBytes,
    info,
  );
}
