import { esc, rng } from "@/features/effects/render/util";
import { PALETTES, bizDimensions, type BizOptions, type BizTemplate, type Palette } from "./meta";

/** An image the customer supplied, ready to embed. The logo/product pixels are never altered by us. */
export type BizImage = { dataUri: string; transparent: boolean; width: number; height: number };
export type BizInputs = Partial<Record<"product" | "logo" | "image1" | "image2" | "image3" | "image4", BizImage>>;

type BgFx = "rays" | "bokeh" | "grid" | "stripes" | "blobs" | "shimmer" | "confetti" | "sparkle" | "lanterns" | "none";
type MediaFx = "reveal" | "flip" | "pulse" | "float" | "bounce" | "tilt" | "zoom" | "shine";
type CopyFx = "rise" | "zoom" | "slide";
type Badge = "burst" | "ribbon" | "circle";
type Style = { bg: BgFx; media: MediaFx; copy: CopyFx; badge: Badge; rings?: boolean; sparkles?: boolean; showFx?: "slide" | "fade" | "zoom" | "pop" };

const STYLE: Record<string, Style> = {
  "ad-spotlight": { bg: "bokeh", media: "float", copy: "rise", badge: "burst" },
  "ad-flash-sale": { bg: "rays", media: "bounce", copy: "zoom", badge: "burst" },
  "ad-fresh": { bg: "blobs", media: "tilt", copy: "rise", badge: "circle" },
  "ad-neon": { bg: "grid", media: "pulse", copy: "slide", badge: "ribbon" },
  "ad-luxury": { bg: "shimmer", media: "float", copy: "rise", badge: "ribbon" },
  "ad-pop-card": { bg: "confetti", media: "bounce", copy: "zoom", badge: "circle" },
  "logo-glow-reveal": { bg: "bokeh", media: "reveal", copy: "rise", badge: "circle" },
  "logo-flip": { bg: "grid", media: "flip", copy: "rise", badge: "circle" },
  "logo-pulse-ring": { bg: "blobs", media: "pulse", copy: "rise", badge: "circle", rings: true },
  "logo-shine": { bg: "shimmer", media: "shine", copy: "rise", badge: "circle" },
  "logo-sparkle": { bg: "sparkle", media: "float", copy: "rise", badge: "circle", sparkles: true },
  "banner-sale": { bg: "rays", media: "bounce", copy: "zoom", badge: "burst" },
  "banner-announce": { bg: "stripes", media: "float", copy: "slide", badge: "ribbon" },
  "banner-festival": { bg: "lanterns", media: "float", copy: "rise", badge: "burst" },
  "banner-new-arrival": { bg: "blobs", media: "tilt", copy: "slide", badge: "ribbon" },
  "banner-opening": { bg: "confetti", media: "bounce", copy: "zoom", badge: "burst" },
  "show-slide": { bg: "bokeh", media: "float", copy: "rise", badge: "ribbon", showFx: "slide" },
  "show-fade": { bg: "blobs", media: "float", copy: "rise", badge: "ribbon", showFx: "fade" },
  "show-zoom": { bg: "sparkle", media: "float", copy: "rise", badge: "ribbon", showFx: "zoom" },
  "show-pop": { bg: "confetti", media: "float", copy: "rise", badge: "ribbon", showFx: "pop" },
};

const u = (n: number) => `calc(var(--u)*${n})`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Headline size (in --u) from text length and shape, so long names wrap instead of overflowing. */
function headSize(text: string, horizontal: boolean): number {
  const n = text.length;
  const base = n <= 10 ? 11 : n <= 18 ? 9 : n <= 28 ? 7.2 : 6;
  return horizontal ? base * 1.15 : base;
}

/* ---------- animated backgrounds (all periodic, so the GIF loops without a jump) ---------- */
function background(fx: BgFx, p: Palette, L: number, seed: number): string {
  const r = rng(seed);
  const base = `.bg{position:absolute;inset:0;background:radial-gradient(120% 120% at 30% 20%,${p.bg1},${p.bg2});overflow:hidden}`;
  const dots = (n: number, make: (i: number) => string) => Array.from({ length: n }, (_, i) => make(i)).join("");
  switch (fx) {
    case "rays":
      return `${base}.rays{position:absolute;left:-50%;top:-50%;width:200%;height:200%;background:repeating-conic-gradient(from 0deg,${p.accent}38 0 10deg,transparent 10deg 20deg);animation:spin ${L}s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}.vig{position:absolute;inset:0;background:radial-gradient(circle,transparent 35%,${p.bg2}cc)}`
        + `<!--h:<div class="rays"></div><div class="vig"></div>-->`;
    case "bokeh":
      return `${base}.bk{position:absolute;border-radius:50%;filter:blur(${u(0.6)});animation:bkrise ${L}s linear infinite}
@keyframes bkrise{0%{transform:translateY(0);opacity:0}15%{opacity:.7}85%{opacity:.7}100%{transform:translateY(${u(-60)});opacity:0}}<!--h:${dots(14, (i) => {
        const s = 3 + r() * 7;
        return `<i class="bk" style="left:${(r() * 96).toFixed(0)}%;top:${(40 + r() * 70).toFixed(0)}%;width:${u(s)};height:${u(s)};background:${i % 2 ? p.accent : p.accent2};animation-delay:-${(r() * L).toFixed(2)}s"></i>`;
      })}-->`;
    case "grid":
      return `${base}.gr{position:absolute;inset:-10% 0 0 0;background-image:linear-gradient(${p.accent}55 1px,transparent 1px),linear-gradient(90deg,${p.accent}55 1px,transparent 1px);background-size:${u(8)} ${u(8)};animation:gridmove ${L / 2}s linear infinite;opacity:.55;mask-image:linear-gradient(transparent,#000 40%,#000)}
@keyframes gridmove{to{background-position:0 ${u(8)}}}<!--h:<div class="gr"></div>-->`;
    case "stripes":
      return `${base}.st{position:absolute;inset:-20%;background:repeating-linear-gradient(115deg,${p.accent}22 0 ${u(6)},transparent ${u(6)} ${u(12)});animation:stripe ${L / 2}s linear infinite}
@keyframes stripe{to{background-position:${u(12)} 0}}<!--h:<div class="st"></div>-->`;
    case "blobs":
      return `${base}.bl{position:absolute;border-radius:50%;filter:blur(${u(6)});opacity:.55;animation:drift ${L}s ease-in-out infinite}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(${u(14)},${u(-10)}) scale(1.25)}}<!--h:${[0, 1, 2].map((i) => `<i class="bl" style="left:${[-10, 55, 25][i]}%;top:${[5, 40, 65][i]}%;width:${u(55)};height:${u(55)};background:${[p.accent, p.accent2, p.bg1][i]};animation-delay:-${i * (L / 3)}s"></i>`).join("")}-->`;
    case "shimmer":
      return `${base}.sh{position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,${p.accent}40 50%,transparent 65%);transform:translateX(-100%);animation:sweep ${L}s ease-in-out infinite}
@keyframes sweep{0%{transform:translateX(-100%)}60%,100%{transform:translateX(100%)}}<!--h:<div class="sh"></div>-->`;
    case "confetti":
      return `${base}.cf{position:absolute;top:-8%;animation:fall ${L / 2}s linear infinite}
@keyframes fall{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(${u(125)}) rotate(360deg)}}<!--h:${dots(22, (i) => {
        const c = [p.accent, p.accent2, "#ffffff", p.bg1][i % 4];
        return `<i class="cf" style="left:${(r() * 98).toFixed(0)}%;width:${u(2 + r() * 2)};height:${u(1.2 + r() * 1.4)};background:${c};animation-delay:-${(r() * L).toFixed(2)}s;opacity:.85"></i>`;
      })}-->`;
    case "sparkle":
      return `${base}.sp{position:absolute;width:${u(1.6)};height:${u(1.6)};border-radius:50%;background:#fff;box-shadow:0 0 ${u(2.5)} ${p.accent};animation:tw ${L / 2}s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.1;transform:scale(.5)}50%{opacity:1;transform:scale(1.4)}}<!--h:${dots(26, () => `<i class="sp" style="left:${(r() * 98).toFixed(0)}%;top:${(r() * 98).toFixed(0)}%;animation-delay:-${(r() * L).toFixed(2)}s"></i>`)}-->`;
    case "lanterns":
      return `${base}.ln{position:absolute;top:${u(-6)};transform-origin:50% 0;animation:swing ${L}s ease-in-out infinite}
.ln b{display:block;margin:0 auto;width:2px;height:${u(10)};background:${p.accent}}.ln span{display:block;width:${u(8)};height:${u(10)};border-radius:40% 40% 46% 46%;background:linear-gradient(${p.accent},${p.accent2});box-shadow:0 0 ${u(5)} ${p.accent2}}
@keyframes swing{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}<!--h:${[8, 30, 70, 92].map((x, i) => `<div class="ln" style="left:${x}%;animation-delay:-${i * 0.9}s"><b></b><span></span></div>`).join("")}-->`;
    default:
      return `${base}<!--h:-->`;
  }
}

/** Splits background() output into its css and html parts. */
function splitBg(raw: string): { css: string; html: string } {
  const m = raw.match(/<!--h:([\s\S]*?)-->$/);
  return { css: raw.replace(/<!--h:[\s\S]*?-->$/, ""), html: m ? m[1] : "" };
}

const KEYFRAMES = (L: number) => `
@keyframes reveal{0%{opacity:0;transform:scale(.55)}14%{opacity:1;transform:scale(1.07)}20%{transform:scale(1)}90%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.55)}}
@keyframes flip{0%{opacity:0;transform:rotateY(-180deg)}25%{opacity:1;transform:rotateY(0)}90%{opacity:1;transform:rotateY(0)}100%{opacity:0;transform:rotateY(180deg)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(${u(-2.5)})}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes bounce{0%,100%{transform:translateY(0) scale(1,1)}20%{transform:translateY(${u(-4.5)}) scale(.98,1.03)}40%{transform:translateY(0) scale(1.04,.96)}50%{transform:scale(1,1)}}
@keyframes tilt{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes zoomio{0%,100%{transform:scale(.95)}50%{transform:scale(1.06)}}
@keyframes rise{0%{opacity:0;transform:translateY(${u(5)})}12%{opacity:1;transform:translateY(0)}88%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(${u(-2)})}}
@keyframes cz{0%{opacity:0;transform:scale(.6)}12%{opacity:1;transform:scale(1.06)}17%{transform:scale(1)}88%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.9)}}
@keyframes cs{0%{opacity:0;transform:translateX(${u(-14)})}12%{opacity:1;transform:translateX(0)}88%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(${u(8)})}}
@keyframes bp{0%,100%{transform:scale(1) rotate(-4deg)}50%{transform:scale(1.12) rotate(4deg)}}
@keyframes bsp{to{transform:rotate(360deg)}}
@keyframes ring{0%{transform:scale(.55);opacity:.8}100%{transform:scale(1.9);opacity:0}}
@keyframes tw{0%,100%{opacity:.1;transform:scale(.5)}50%{opacity:1;transform:scale(1.4)}}
@keyframes glint{0%,20%{transform:translateX(-130%)}70%,100%{transform:translateX(130%)}}
@keyframes cta{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
.mfx{animation:var(--mfx) ${L}s ease-in-out infinite}`;

function copyAnim(fx: CopyFx, L: number, delay: number): string {
  const name = fx === "rise" ? "rise" : fx === "zoom" ? "cz" : "cs";
  return `animation:${name} ${L}s ease-out infinite;animation-delay:${delay}s`;
}

function badgeHtml(kind: Badge, text: string, p: Palette): string {
  const t = esc(text);
  const size = text.length > 9 ? 1.7 : text.length > 6 ? 2.2 : 3;
  if (kind === "ribbon")
    return `<div class="bd rib" style="background:${p.accent};color:#1b1b1b;font-size:${u(4.2)};padding:${u(1)} ${u(3.2)};animation:cta 2s ease-in-out infinite">${t}</div>`;
  if (kind === "circle")
    return `<div class="bd cir" style="background:${p.accent2};color:#fff;font-size:${u(size + 1)};width:${u(17)};height:${u(17)};animation:bp 2s ease-in-out infinite">${t}</div>`;
  return `<div class="bd bur" style="background:${p.accent};color:#1b1b1b;font-size:${u(size + 0.6)};width:${u(23)};height:${u(23)};animation:bsp ${4}s linear infinite"><span style="animation:bsp ${4}s linear infinite reverse;display:block">${t}</span></div>`;
}

type Layout = { w: number; h: number; horizontal: boolean };

function panelCss(panel: "white" | "dark" | "none"): string {
  if (panel === "white") return "background:#fff;border-radius:calc(var(--u)*4);padding:calc(var(--u)*3);box-shadow:0 calc(var(--u)*1.2) calc(var(--u)*4) rgba(0,0,0,.35)";
  if (panel === "dark") return "background:#0d0f1a;border-radius:calc(var(--u)*4);padding:calc(var(--u)*3);box-shadow:0 calc(var(--u)*1.2) calc(var(--u)*4) rgba(0,0,0,.45)";
  return "";
}

function resolvePanel(t: BizTemplate, opts: BizOptions, img?: BizImage): "white" | "dark" | "none" {
  if (opts.panel !== "auto") return opts.panel;
  if (t.kind === "logo") return img?.transparent ? "white" : "none"; // a transparent logo might vanish on the colour: give it a card
  if (img && !img.transparent) return "none"; // opaque photo already has its own background
  return "none";
}

function cleanText(s: string | undefined): string {
  return esc(s ?? "");
}

/** Showcase: sample the motion per 1% so slides, fades and zooms loop perfectly. */
function showcaseMotion(fx: NonNullable<Style["showFx"]>, k: number, n: number): { name: string; frames: string } {
  const P = 1 / n;
  const stops: string[] = [];
  for (let i = 0; i <= 100; i++) {
    let x = i / 100 - k * P; // position inside this slide's window, wrapped
    x = ((x % 1) + 1) % 1;
    const inW = x / P; // 0..1 across the window, >1 outside
    const edge = 0.14;
    let op = 0;
    let tf = "";
    if (inW <= 1) {
      const inn = Math.min(1, inW / edge);
      const out = Math.min(1, (1 - inW) / edge);
      const vis = fx === "fade" ? Math.min(inn, out) : Math.min(inn, out) > 0.02 ? 1 : 0;
      op = fx === "fade" || fx === "zoom" ? Math.min(inn, out) : vis;
      if (fx === "slide") tf = `translateX(${((1 - inn) * 100 - (1 - out) * 100).toFixed(1)}%)`;
      else if (fx === "zoom") tf = `scale(${(1 + 0.14 * inW).toFixed(3)})`;
      else if (fx === "pop") {
        const s = inn < 1 ? 0.4 + 0.75 * inn - 0.15 * Math.sin(inn * Math.PI) * -1 : 1;
        tf = `scale(${(out < 1 ? 1 - (1 - out) * 0.5 : Math.min(1.08, s)).toFixed(3)})`;
        op = Math.min(inn * 1.6, out * 1.6, 1);
      }
    }
    stops.push(`${i}%{opacity:${op.toFixed(3)};${tf ? `transform:${tf}` : ""}}`);
  }
  const name = `sc${k}`;
  return { name, frames: `@keyframes ${name}{${stops.join("")}}` };
}

/** Builds the complete HTML document for one business GIF. All customer text is escaped; images are data URIs. */
export function buildBusinessDocument(t: BizTemplate, opts: BizOptions, inputs: BizInputs, w: number, h: number): string {
  const p = PALETTES.find((x) => x.id === opts.palette) ?? PALETTES[0];
  const st = STYLE[t.id] ?? STYLE["ad-spotlight"];
  const L = t.seconds;
  const lay: Layout = { w, h, horizontal: w / h > 1.25 };
  const f = opts.fields;
  const bg = splitBg(background(st.bg, p, L, t.id.length * 97));
  const stageU = Math.min(w, h) / 100;

  // ---------- media ----------
  let media = "";
  let extraCss = "";
  if (t.kind === "showcase") {
    const slides = (["image1", "image2", "image3", "image4"] as const).filter((k) => inputs[k]);
    const n = Math.max(1, slides.length);
    const fx = st.showFx ?? "fade";
    const parts = slides.map((key, k) => {
      const m = showcaseMotion(fx, k, n);
      extraCss += m.frames;
      const cap = f[`caption${k + 1}` as "caption1"];
      return `<div class="sl" style="animation:${m.name} ${L}s linear infinite"><img src="${inputs[key]!.dataUri}" alt="">${cap ? `<p class="cap">${cleanText(cap)}</p>` : ""}</div>`;
    });
    const dots = slides.map((_, k) => {
      const d = showcaseMotion("fade", k, n);
      extraCss += d.frames.replace(`sc${k}`, `dt${k}`);
      return `<i style="animation:dt${k} ${L}s linear infinite"></i>`;
    });
    media = `<div class="stack">${parts.join("")}</div><div class="dots">${slides.map(() => "<i class='dd'></i>").join("")}<div class="dl">${dots.join("")}</div></div>`;
  } else {
    const img = t.kind === "logo" ? inputs.logo : (inputs.product ?? inputs.logo);
    if (img) {
      const panel = resolvePanel(t, opts, img);
      const rings = st.rings ? [0, 1, 2].map((i) => `<i class="rg" style="animation-delay:-${(i * L) / 3}s"></i>`).join("") : "";
      const sparkles = st.sparkles
        ? (() => {
            const r = rng(7);
            return Array.from({ length: 9 }, (_, i) => `<i class="spk" style="left:${(10 + r() * 80).toFixed(0)}%;top:${(8 + r() * 84).toFixed(0)}%;animation-delay:-${(r() * L).toFixed(2)}s"></i>`).join("");
          })()
        : "";
      const shine = st.media === "shine" ? `<i class="gl"></i>` : "";
      const afx = st.media === "shine" ? "float" : st.media;
      media = `${rings}<div class="mw"><div class="mfx" style="--mfx:${afx === "zoom" ? "zoomio" : afx};${panelCss(panel)}"><img class="m" src="${img.dataUri}" alt="">${shine}</div></div>${sparkles}`;
    }
  }

  // ---------- copy ----------
  const tz = lay.horizontal ? 1.3 : h / w > 1.5 ? 1.2 : 1; // text scale: wide canvases are short, so text can be relatively larger
  const hs = headSize(f.headline ?? f.brand ?? "", lay.horizontal);
  const parts: string[] = [];
  let d = 0;
  const add = (html: string) => {
    parts.push(`<div class="cp" style="${copyAnim(st.copy, L, d)}">${html}</div>`);
    d += 0.18;
  };
  const brandText = f.brand;
  if (t.kind === "logo") {
    if (brandText) add(`<div class="hd" style="font-size:${u(clamp(headSize(brandText, lay.horizontal), 5, 10))}">${cleanText(brandText)}</div>`);
    if (f.tagline) add(`<div class="sb" style="font-size:${u(4.4 * tz)}">${cleanText(f.tagline)}</div>`);
  } else {
    if (brandText && t.kind !== "showcase") add(`<div class="br" style="font-size:${u(3.6 * tz)}">${cleanText(brandText)}</div>`);
    if (f.headline) add(`<div class="hd" style="font-size:${u(hs)}">${cleanText(f.headline)}</div>`);
    if (f.subtitle) add(`<div class="sb" style="font-size:${u(4.2 * tz)}">${cleanText(f.subtitle)}</div>`);
    if (f.price || f.oldPrice) {
      add(`<div class="pr">${f.oldPrice ? `<s style="font-size:${u(4.6 * (lay.horizontal ? 1 : tz))}">${cleanText(f.oldPrice)}</s>` : ""}${f.price ? `<b style="font-size:${u((f.price.length > 10 ? 6.4 : 8) * (lay.horizontal ? 1 : tz))}">${cleanText(f.price)}</b>` : ""}</div>`);
    }
    if (f.cta) add(`<div class="ct" style="font-size:${u(4.4 * tz)}">${cleanText(f.cta)}</div>`);
  }
  const badge = f.discount && t.kind !== "logo" && t.kind !== "showcase" ? badgeHtml(st.badge, f.discount, p) : "";
  const showBrand = t.kind === "showcase" && brandText ? `<div class="br top" style="font-size:${u(3.6)}">${cleanText(brandText)}</div>` : "";

  const hasMedia = Boolean(media);
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<style>
html,body{margin:0;background:#000}
*{box-sizing:border-box}
#stage{position:relative;width:${w}px;height:${h}px;overflow:hidden;--u:${stageU}px;font-family:"DejaVu Sans","Noto Color Emoji",sans-serif;color:${p.text}}
${bg.css}
#fg{position:absolute;inset:0;display:flex;flex-direction:${lay.horizontal ? "row" : "column"};align-items:center;justify-content:center;gap:${u(lay.horizontal ? 5 : 3)};padding:${u(lay.horizontal ? 5 : 6)}}
.media{position:relative;flex:${hasMedia ? "1 1 0" : "0 0 0"};min-width:0;min-height:0;width:${lay.horizontal ? "auto" : "100%"};height:${lay.horizontal ? "100%" : "auto"};display:flex;align-items:center;justify-content:center;perspective:${u(120)}}
.mw{max-width:100%;max-height:100%;display:flex;align-items:center;justify-content:center;height:100%;width:100%}
.mfx{position:relative;max-width:92%;max-height:96%;display:flex;overflow:hidden;border-radius:${u(2)};filter:drop-shadow(0 ${u(1.4)} ${u(2.4)} rgba(0,0,0,.35))}
.m{display:block;max-width:100%;max-height:100%;object-fit:contain;min-height:0}
.gl{position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.75) 50%,transparent 65%);animation:glint ${L}s ease-in-out infinite}
.rg{position:absolute;left:50%;top:50%;width:${u(30)};height:${u(30)};margin:${u(-15)} 0 0 ${u(-15)};border:${u(0.8)} solid ${p.accent};border-radius:50%;animation:ring ${L / 2}s ease-out infinite}
.spk{position:absolute;width:${u(2)};height:${u(2)};background:#fff;border-radius:50%;box-shadow:0 0 ${u(3)} ${p.accent};animation:tw ${L / 2}s ease-in-out infinite}
.copy{flex:${hasMedia ? `0 0 ${lay.horizontal ? "46%" : "auto"}` : "1 1 auto"};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${u(1.8)};text-align:center;min-width:0;max-width:100%}
.cp{opacity:0}
.br{letter-spacing:.14em;text-transform:uppercase;color:${p.accent};font-weight:700}
.br.top{position:absolute;left:0;right:0;top:${u(3)};text-align:center;z-index:3}
.hd{font-weight:800;line-height:1.08;text-shadow:0 ${u(0.5)} ${u(1.4)} rgba(0,0,0,${p.dark ? ".5" : ".12"});overflow-wrap:anywhere}
.sb{opacity:.92;line-height:1.25;overflow-wrap:anywhere}
.pr{display:flex;flex-wrap:nowrap;white-space:nowrap;align-items:baseline;justify-content:center;gap:${u(2.2)}}
.pr s{opacity:.7;text-decoration-thickness:${u(0.5)};text-decoration-color:#ff4d5a}
.pr b{color:${p.accent};text-shadow:0 0 ${u(3)} ${p.accent}66}
.ct{margin-top:${u(0.8)};padding:${u(1.5)} ${u(4.2)};border-radius:999px;background:${p.accent};color:#1b1b1b;font-weight:800;box-shadow:0 ${u(0.8)} ${u(2.4)} rgba(0,0,0,.35)}
.bd{position:absolute;${lay.horizontal ? `left:${u(4)}` : `right:${u(4)}`};top:${u(4)};z-index:4;display:flex;align-items:center;justify-content:center;font-weight:900;text-align:center;line-height:1.05;box-shadow:0 ${u(0.8)} ${u(2.4)} rgba(0,0,0,.4)}
.bd.bur{clip-path:polygon(50% 0,61% 14%,79% 9%,81% 28%,98% 35%,87% 50%,98% 65%,81% 72%,79% 91%,61% 86%,50% 100%,39% 86%,21% 91%,19% 72%,2% 65%,13% 50%,2% 35%,19% 28%,21% 9%,39% 14%)}
.bd.cir{border-radius:50%;border:${u(0.7)} dashed #fff}
.bd.rib{border-radius:${u(1.4)};letter-spacing:.04em}
.stack{position:relative;width:100%;height:100%;border-radius:${u(3)};overflow:hidden;box-shadow:0 ${u(1.6)} ${u(5)} rgba(0,0,0,.45);background:#000}
.sl{position:absolute;inset:0;opacity:0}
.sl img{width:100%;height:100%;object-fit:cover;display:block}
.cap{position:absolute;left:0;right:0;bottom:0;margin:0;padding:${u(6)} ${u(3)} ${u(3)};text-align:center;font-weight:700;font-size:${u(5)};color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.7))}
.dots{position:absolute;left:0;right:0;bottom:${u(1.6)};display:flex;justify-content:center;z-index:5}
.dd{width:${u(1.4)};height:${u(1.4)};border-radius:50%;background:#ffffff55;margin:0 ${u(0.7)}}
.dl{position:absolute;display:flex;left:50%;transform:translateX(-50%)}
.dl i{width:${u(1.4)};height:${u(1.4)};margin:0 ${u(0.7)};border-radius:50%;background:${p.accent}}
${t.kind === "showcase" ? `#fg{padding-top:${u(9)}}.copy{flex:0 0 auto}` : ""}
${KEYFRAMES(L)}
${extraCss}
#stage *{animation-iteration-count:infinite !important}
</style></head><body><div id="stage"><div class="bg">${bg.html}</div>${showBrand}<div id="fg">${hasMedia ? `<div class="media">${media}</div>` : ""}<div class="copy">${parts.join("")}</div></div>${badge}</div></body></html>`;
}

export { bizDimensions };
