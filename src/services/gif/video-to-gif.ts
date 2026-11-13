import { promises as fs } from "node:fs";
import path from "node:path";
import { runFfmpeg, withTempDir } from "./ffmpeg";

export type GifOptions = {
  maxSeconds?: number;
  maxBytes?: number;
};

/** Quality ladder: tried in order until the GIF fits under maxBytes. */
const LADDER = [
  { width: 480, fps: 12, colors: 128 },
  { width: 400, fps: 10, colors: 96 },
  { width: 320, fps: 10, colors: 64 },
  { width: 256, fps: 8, colors: 48 },
];

/**
 * Converts an MP4/WebM buffer into an optimized GIF using a two-pass palette,
 * stepping down quality until the file is small enough to share.
 */
export async function videoToGif(
  video: Buffer,
  { maxSeconds = 5, maxBytes = 8 * 1024 * 1024 }: GifOptions = {},
): Promise<{ gif: Buffer; width: number; fps: number }> {
  return withTempDir(async (dir) => {
    const input = path.join(dir, "in.mp4");
    const output = path.join(dir, "out.gif");
    await fs.writeFile(input, video);

    let last: { gif: Buffer; width: number; fps: number } | null = null;
    for (const step of LADDER) {
      const filter =
        `fps=${step.fps},scale=${step.width}:-1:flags=lanczos,split[a][b];` +
        `[a]palettegen=max_colors=${step.colors}:stats_mode=diff[p];` +
        `[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
      await runFfmpeg(["-t", String(maxSeconds), "-i", input, "-filter_complex", filter, "-loop", "0", output]);
      const gif = await fs.readFile(output);
      last = { gif, width: step.width, fps: step.fps };
      if (gif.length <= maxBytes) return last;
    }
    return last!; // smallest attempt; caller may still accept it
  });
}
