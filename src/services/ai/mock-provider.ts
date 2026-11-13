import { promises as fs } from "node:fs";
import path from "node:path";
import { runFfmpeg, withTempDir } from "@/services/gif/ffmpeg";
import type { MotionProvider } from "./types";

/**
 * Zero-cost stand-in for the AI model. Produces a real MP4 with a slow zoom and
 * gentle sway so the entire pipeline (worker -> GIF -> storage -> download) can
 * be tested without spending any AI budget.
 */
export const mockProvider: MotionProvider = {
  async imageToMotion(image, _prompt, seconds) {
    const video = await withTempDir(async (dir) => {
      const input = path.join(dir, "in.png");
      const output = path.join(dir, "out.mp4");
      await fs.writeFile(input, image);
      const frames = seconds * 24;
      const filter =
        `scale=1024:-2,zoompan=z='min(zoom+0.0015,1.25)':` +
        `x='iw/2-(iw/zoom/2)+sin(on/10)*12':y='ih/2-(ih/zoom/2)':d=${frames}:s=512x512:fps=24,format=yuv420p`;
      await runFfmpeg(["-loop", "1", "-i", input, "-vf", filter, "-t", String(seconds), "-c:v", "libx264", output]);
      return fs.readFile(output);
    });
    return { video, provider: "mock", model: "mock-zoompan", costUsd: 0 };
  },
};
