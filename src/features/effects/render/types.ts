export type Level = 1 | 2 | 3;

export type Eyes = { left: { x: number; y: number }; right: { x: number; y: number }; width: number };

export type RenderOptions = {
  text: string;
  theme: string;
  level: Level;
  /** Manual fix for eye positions, in percent of the image (-10..10). */
  nudge?: { x: number; y: number };
};

/** AI results some effects need. Missing values mean the effect falls back to the original photo. */
export type RenderExtras = {
  edited?: Buffer; // AI-edited photo, same size as the original
  eyes?: Eyes;
};

export type RenderSpec = {
  maxSize: number; // longest side in px
  fps: number;
  seconds: number;
  preview: boolean; // low-res, watermarked, free preview
};

export type FrameSource = {
  count: number;
  frame: (index: number) => Promise<Buffer>; // PNG
};

export type RenderContext = {
  base: Buffer; // normalized PNG, no alpha
  width: number;
  height: number;
  opts: RenderOptions;
  spec: RenderSpec;
  extras: RenderExtras;
};

export type EffectRenderer = (ctx: RenderContext) => Promise<FrameSource>;
