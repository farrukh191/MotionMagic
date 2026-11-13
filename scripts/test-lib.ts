import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { runFfmpeg } from "@/services/gif/ffmpeg";

const diff = (a: Buffer, b: Buffer) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
};

/** How big the jump from the last frame back to the first is, relative to a normal frame step (~1 = seamless). */
export async function loopRatio(gif: Buffer, frames: number): Promise<number> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mmt-"));
  try {
    await fs.writeFile(path.join(dir, "in.gif"), gif);
    await runFfmpeg(["-i", path.join(dir, "in.gif"), "-vsync", "0", path.join(dir, "f%04d.png")]);
    const bufs: Buffer[] = [];
    for (let i = 0; i < frames; i++) bufs.push(await sharp(path.join(dir, `f${String(i + 1).padStart(4, "0")}.png`)).removeAlpha().raw().toBuffer());
    let total = 0;
    for (let i = 1; i < frames; i++) total += diff(bufs[i - 1], bufs[i]);
    return diff(bufs[frames - 1], bufs[0]) / (total / (frames - 1) || 0.0001);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export function makeChecker() {
  const failures: string[] = [];
  return {
    failures,
    check: (ok: boolean, msg: string) => {
      if (!ok) failures.push(msg);
      console.log(ok ? "  ok  " : "  FAIL", msg);
    },
  };
}
