/**
 * Safety + quality test for the HTML/CSS animation engine. No AI spend.
 * Feeds hostile and broken "AI" designs through the sanitizer and renderer. Run: npm run test:html
 */
import { PRESETS } from "@/features/effects/html/presets";
import { closeBrowser } from "@/features/effects/html/browser";
import { renderDesignGif } from "@/features/effects/html/render-html";
import { DesignError, sanitizeDesign } from "@/features/effects/html/sanitize";
import { loopRatio, makeChecker } from "./test-lib";
import { sampleImage } from "./sample-image";

const { check, failures } = makeChecker();
const SPEC = { maxSize: 480, fps: 12, seconds: 4, preview: false } as const;

async function main() {
  const img = await sampleImage(800);

  console.log("\n[1] Hostile designs are neutralised");
  const hostile = `<div class="a" onclick="alert(1)" style="background:url(http://evil.example/x.png);color:red">hi</div>
    <script>alert(1)</script><img src="http://evil.example/p.png" onerror="alert(2)"><iframe src="http://evil.example"></iframe>
    <svg onload="alert(3)" viewBox="0 0 10 10"><path d="M0 0L10 10" fill="red"/><foreignObject><div>x</div></foreignObject><use href="http://evil.example/s.svg#a"/></svg>
    <a href="javascript:alert(4)">link</a><form action="http://evil.example"><input name=x></form><link rel=stylesheet href="http://evil.example/a.css"><object data="x"></object>
    <style>@import url(http://evil.example/a.css); @font-face{font-family:x;src:url(http://evil.example/f.woff)} .a{background:url('https://evil.example/b.png');animation:m 2s infinite} @keyframes m{to{transform:translateX(20px)}}</style>`;
  const s = await sanitizeDesign(hostile);
  const bad = [/<script/i, /onclick|onerror|onload/i, /<iframe/i, /<img/i, /<form/i, /<link/i, /<object/i, /<a[ >]/i, /foreignobject/i, /<use/i, /evil\.example/i, /@import/i, /@font-face/i, /javascript:/i];
  for (const re of bad) check(!re.test(s.html), `sanitizer removed ${re}`);
  check(/<div class="a"/.test(s.html) && /<path/.test(s.html), "sanitizer kept the safe parts (div, svg path)");

  console.log("\n[2] The hostile design, once sanitised, still renders (no external URL survives to be fetched)");
  const r = await renderDesignGif(s.html, img, SPEC);
  check(r.gif.subarray(0, 6).toString("ascii").startsWith("GIF89a"), "rendered a valid GIF after sanitising");

  console.log("\n[3] Bad designs are rejected with a clear error (never crash)");
  for (const [name, html] of [["empty", ""], ["too short", "<b>x</b>"], ["huge", "<div>" + "x".repeat(50_000) + "</div>"], ["too many elements", "<div>" + "<i></i>".repeat(600) + "</div>"]] as const) {
    const err = await sanitizeDesign(html).then(() => null, (e) => e);
    check(err instanceof DesignError, `rejects ${name}`);
  }
  const still = await sanitizeDesign(`<div style="position:absolute;inset:0;background:rgba(255,0,0,.2)">no motion at all here</div>`);
  const err2 = await renderDesignGif(still.html, img, SPEC).then(() => null, (e) => e);
  check(err2 instanceof DesignError, "rejects a design with no animation");

  console.log("\n[4] Odd timing is snapped so the GIF always loops");
  const odd = await sanitizeDesign(
    `<style>.o{position:absolute;left:10%;top:40%;width:20%;height:20%;background:#ff0;animation:m 3.3s linear 1.7s 2 forwards}
      @keyframes m{from{transform:translateX(0)}to{transform:translateX(300%)}}</style><div class="o"></div>`,
  );
  const ro = await renderDesignGif(odd.html, img, SPEC);
  const ratio = await loopRatio(ro.gif, ro.frames);
  check(ratio < 4, `odd 3.3s/delayed/finite animation loops seamlessly (seam = ${ratio.toFixed(2)}x a normal step)`);

  console.log("\n[5] Presets: size, speed, seamless loop, preview watermark");
  for (const p of PRESETS) {
    const t0 = Date.now();
    const d = await sanitizeDesign(p.build("Eid Mubarak"));
    const f = await renderDesignGif(d.html, img, SPEC);
    const lr = await loopRatio(f.gif, f.frames);
    check(f.gif.length < 5 * 1024 * 1024 && f.frames === 48, `${p.id}: ${(f.gif.length / 1024).toFixed(0)} KB, ${f.frames} frames, ${Date.now() - t0} ms`);
    check(lr < 4, `${p.id}: loop seam ${lr.toFixed(2)}x`);
  }
  const pv = await renderDesignGif((await sanitizeDesign(PRESETS[0].build("Hi"))).html, img, { maxSize: 288, fps: 10, seconds: 4, preview: true });
  check(pv.gif.length < 1.5 * 1024 * 1024 && pv.width <= 288, `preview ${(pv.gif.length / 1024).toFixed(0)} KB at ${pv.width}px`);

  await closeBrowser();
  if (failures.length) {
    console.error(`\nFAILED (${failures.length})`);
    process.exit(1);
  }
  console.log("\nALL HTML ENGINE CHECKS PASSED");
}

main().catch(async (e) => {
  console.error(e);
  await closeBrowser();
  process.exit(1);
});
