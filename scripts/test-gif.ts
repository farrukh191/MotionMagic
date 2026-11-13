/**
 * Pipeline smoke test with NO database and NO AI spend:
 * synthetic image -> mock motion (MP4) -> optimized GIF -> file on disk.
 * Run: npm run test:gif   (requires ffmpeg on PATH)
 */
import { promises as fs } from "node:fs";
import sharp from "sharp";
import { mockProvider } from "@/services/ai/mock-provider";
import { videoToGif } from "@/services/gif/video-to-gif";

async function main() {
  const image = await sharp({
    create: { width: 800, height: 800, channels: 3, background: { r: 240, g: 90, b: 120 } },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="800" height="800"><circle cx="400" cy="400" r="220" fill="#ffd54a"/><rect x="300" y="330" width="40" height="40" fill="#222"/><rect x="460" y="330" width="40" height="40" fill="#222"/><path d="M300 480 Q400 560 500 480" stroke="#222" stroke-width="16" fill="none"/></svg>`,
        ),
      },
    ])
    .png()
    .toBuffer();

  const t0 = Date.now();
  const motion = await mockProvider.imageToMotion(image, "", 5);
  console.log(`motion video: ${(motion.video.length / 1024).toFixed(0)} KB`);

  const { gif, width, fps } = await videoToGif(motion.video, { maxSeconds: 5 });
  await fs.mkdir(".storage", { recursive: true });
  await fs.writeFile(".storage/test.gif", gif);

  const header = gif.subarray(0, 6).toString("ascii");
  console.log(`GIF ok: header=${header} size=${(gif.length / 1024).toFixed(0)} KB width=${width} fps=${fps} time=${Date.now() - t0}ms`);
  if (!header.startsWith("GIF")) throw new Error("Output is not a GIF");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
