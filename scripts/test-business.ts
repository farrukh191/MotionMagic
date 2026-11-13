/** Business studio checks: option safety, escaping, logo preservation, every size, text-only banner. Run: npm run test:business */
import sharp from "sharp";
import { BUSINESS_TEMPLATES, BIZ_SIZE_IDS, bizDimensions, missingForBiz, normalizeBizOptions } from "@/features/business/meta";
import { buildBusinessDocument } from "@/features/business/build";
import { renderBusinessGif, toBizImage } from "@/features/business/render";
import { PREVIEW_SPEC } from "@/features/effects/render";
import { closeBrowser } from "@/features/effects/html/browser";
import { normalizePrompt, promptKey } from "@/features/generation/prompt-key";
import { sampleBizInputs } from "./biz-inputs";

let failed = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) failed++;
};

async function main() {
  const ad = BUSINESS_TEMPLATES.find((t) => t.id === "ad-flash-sale")!;
  const logo = BUSINESS_TEMPLATES.find((t) => t.id === "logo-shine")!;
  const banner = BUSINESS_TEMPLATES.find((t) => t.id === "banner-sale")!;
  const show = BUSINESS_TEMPLATES.find((t) => t.id === "show-slide")!;

  console.log("\n[1] 20 templates, 4 kinds");
  check(BUSINESS_TEMPLATES.length === 20, "20 templates");
  check(new Set(BUSINESS_TEMPLATES.map((t) => t.slug)).size === 20, "unique slugs");

  console.log("\n[2] Options are clamped and cleaned");
  const o = normalizeBizOptions(ad, { size: "evil", palette: "nope", panel: "x", fields: { headline: "<script>alert(1)</script>".repeat(5), price: "x".repeat(99), bogus: "y" } });
  check(o.size === ad.defaultSize && o.palette === ad.palette && o.panel === "auto", "bad size/palette/panel fall back");
  check(!/[<>]/.test(o.fields.headline ?? ""), "angle brackets stripped from text");
  check((o.fields.headline ?? "").length <= 40 && (o.fields.price ?? "").length <= 18, "max lengths enforced");
  check(!("bogus" in o.fields), "unknown fields dropped");
  check(missingForBiz(ad, normalizeBizOptions(ad, {}), []).length === 2, "missing product name + photo reported");
  check(missingForBiz(show, normalizeBizOptions(show, { fields: { headline: "x" } }), ["image1", "image2"]).length === 0, "showcase with 2 photos is complete");

  console.log("\n[3] Customer text is escaped in the HTML");
  const inputs = await sampleBizInputs();
  const html = buildBusinessDocument(ad, { size: "square", palette: ad.palette, panel: "auto", fields: { headline: `"><img src=x onerror=alert(1)> & <b>`, price: `'"</style>` } }, inputs, 480, 480);
  check(!/<img src=x/i.test(html) && !/<b>/.test(html), "markup in text is not interpreted");
  check(!/<script/i.test(html), "no script tags in the document");

  console.log("\n[4] Logo pixels are preserved (only scaled down, never recoloured)");
  const src = await sharp({ create: { width: 300, height: 200, channels: 4, background: { r: 12, g: 200, b: 99, alpha: 1 } } }).png().toBuffer();
  const bi = await toBizImage(src);
  const back = await sharp(Buffer.from(bi.dataUri.split(",")[1], "base64")).raw().toBuffer();
  const orig = await sharp(src).raw().toBuffer();
  check(bi.width === 300 && bi.height === 200 && back.equals(orig), "300x200 logo embedded pixel-for-pixel");
  const glass = await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  check((await toBizImage(glass)).transparent, "transparent logo detected");

  console.log("\n[5] Every kind renders at every size and loops");
  for (const t of [ad, logo, banner, show]) {
    for (const size of BIZ_SIZE_IDS) {
      const r = await renderBusinessGif(t, { size, fields: t.sample }, inputs, { ...PREVIEW_SPEC, seconds: t.seconds });
      const d = bizDimensions(size, PREVIEW_SPEC.maxSize);
      check(r.gif.subarray(0, 6).toString("ascii").startsWith("GIF89a") && r.gif.includes(Buffer.from("NETSCAPE2.0")), `${t.id} ${size}: looping GIF`);
      check(Math.abs(r.width / r.height - d.w / d.h) < 0.03 && r.gif.length < 1.5 * 1024 * 1024, `${t.id} ${size}: ${r.width}x${r.height}, ${Math.round(r.gif.length / 1024)} KB`);
    }
  }

  console.log("\n[6] Text-only banner (no image), long text, hostile text");
  const r = await renderBusinessGif(banner, { size: "wide", fields: { headline: "<b>Eid</b> Sale 50% OFF & more", discount: "50% OFF", cta: "Order on WhatsApp", price: "Rs. 1,234,567" } }, {}, { ...PREVIEW_SPEC, seconds: 4 });
  check(r.gif.length > 10_000, `banner without image renders (${Math.round(r.gif.length / 1024)} KB)`);

  console.log("\n[7] Design cache keys");
  check(normalizePrompt("  Eid MUBARAK, with Lanterns!! ") === "eid mubarak with lanterns", "prompt normalized");
  check(promptKey("Eid Mubarak with lanterns") === promptKey("eid  mubarak, with LANTERNS."), "same idea = same cache key");
  check(promptKey("Eid Mubarak") !== promptKey("Birthday Ahmed"), "different ideas = different keys");

  await closeBrowser();
  if (failed) {
    console.error(`\n${failed} CHECK(S) FAILED`);
    process.exit(1);
  }
  console.log("\nALL BUSINESS CHECKS PASSED");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
