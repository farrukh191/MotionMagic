import { promises as fs } from "node:fs";
import path from "node:path";
import { runFfmpeg, withTempDir } from "@/services/gif/ffmpeg";
import type { FrameSource } from "./types";

/** Quality ladder: each step shrinks the GIF until it fits under maxBytes. */
const LADDER = [
  { scale: 1, colors: 192 },
  { scale: 0.85, colors: 128 },
  { scale: 0.7, colors: 96 },
  { scale: 0.55, colors: 64 },
];

export type EncodedGif = { gif: Buffer; width: number; height: number; fps: number; frames: number; step: number };

/** Writes frames to a temp dir and encodes an optimized, looping GIF with a two-pass palette. */
export async function framesToGif(
  source: FrameSource,
  fps: number,
  maxBytes: number,
  size: { width: number; height: number },
): Promise<EncodedGif> {
  return withTempDir(async (dir) => {
    for (let i = 0; i < source.count; i++) {
      await fs.writeFile(path.join(dir, `f${String(i).padStart(4, "0")}.png`), await source.frame(i));
    }
    const output = path.join(dir, "out.gif");
    let best: EncodedGif | null = null;
    for (let s = 0; s < LADDER.length; s++) {
      const { scale, colors } = LADDER[s];
      const scaleFilter = scale === 1 ? "" : `scale=trunc(iw*${scale}/2)*2:-2:flags=lanczos,`;
      const filter =
        `${scaleFilter}split[a][b];` +
        `[a]palettegen=max_colors=${colors}:stats_mode=full[p];` +
        `[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
      await runFfmpeg([
        "-framerate", String(fps),
        "-i", path.join(dir, "f%04d.png"),
        "-filter_complex", filter,
        "-loop", "0",
        output,
      ]);
      const gif = await fs.readFile(output);
      best = {
        gif,
        width: Math.round(size.width * scale),
        height: Math.round(size.height * scale),
        fps,
        frames: source.count,
        step: s,
      };
      if (gif.length <= maxBytes) break;
    }
    return best!;
  });
}
