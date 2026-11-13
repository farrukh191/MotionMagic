/**
 * Renders every business template to public/samples/biz-<id>.gif (sample text and illustrated stand-in images)
 * and checks size, frame count and loop. Run: npm run samples:biz
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { BUSINESS_TEMPLATES } from "@/features/business/meta";
import { renderBusinessGif } from "@/features/business/render";
import { FINAL_SPEC } from "@/features/effects/render";
import { closeBrowser } from "@/features/effects/html/browser";
import { sampleBizInputs } from "./biz-inputs";
import { loopRatio } from "./test-lib";

async function main() {
  const inputs = await sampleBizInputs();
  const dir = path.join(process.cwd(), "public", "samples");
  await fs.mkdir(dir, { recursive: true });
  let bad = 0;
  console.log("template                 size    dims      frames  loop   ms");
  for (const t of BUSINESS_TEMPLATES) {
    const t0 = Date.now();
    const size = t.kind === "banner" ? "landscape" : "square";
    const res = await renderBusinessGif(t, { size, fields: t.sample }, inputs, { ...FINAL_SPEC, maxSize: 360, seconds: t.seconds }, 700 * 1024); // gallery thumbnails: small files, fast page
    const ratio = await loopRatio(res.gif, res.frames);
    const ok = res.gif.length <= 900 * 1024 && res.frames === Math.round(FINAL_SPEC.fps * t.seconds) && ratio < 4;
    if (!ok) bad++;
    await fs.writeFile(path.join(dir, `${t.slug}.gif`), res.gif);
    console.log(`${(ok ? "" : "FAIL ") + t.id.padEnd(24)} ${String(Math.round(res.gif.length / 1024)).padStart(5)}KB ${`${res.width}x${res.height}`.padEnd(9)} ${String(res.frames).padStart(5)} ${ratio.toFixed(1).padStart(5)}x ${Date.now() - t0}`);
  }
  await closeBrowser();
  if (bad) {
    console.error(`${bad} template(s) failed checks`);
    process.exit(1);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
