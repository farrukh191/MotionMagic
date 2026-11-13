import { esc } from "./text";
import { PERSONAL_SECONDS } from "./meta";

/** Shared building blocks for every scene: loop length, units, the name/greeting text block, base CSS and the page wrapper. */
export const L = PERSONAL_SECONDS;

type SizeBucket = "xs" | "s" | "m" | "l";
const bucket = (name: string): SizeBucket => {
  const n = [...name].length;
  return n <= 6 ? "l" : n <= 10 ? "m" : n <= 14 ? "s" : "xs";
};
const NAME_U: Record<SizeBucket, number> = { l: 15, m: 12, s: 9.5, xs: 7.5 };
const HEAD_U = 6.2;
export const u = (n: number) => `calc(var(--u)*${n})`;

/**
 * The name plus "!". Words never break in the middle (each word is a no-wrap unit; lines break only at spaces) and the
 * "!" stays glued to the last word. Latin names wave letter by letter; other scripts (Urdu, Arabic...) stay joined so
 * their letters connect correctly.
 */
function nameHtml(name: string): string {
  const latin = /^[\p{Script=Latin}\s'’.\-\p{M}]+$/u.test(name);
  const words = name.split(" ");
  let li = 0;
  return `<span class="nm">${words
    .map((w, wi) => {
      const last = wi === words.length - 1;
      const bang = last ? `<span class="ex">!</span>` : "";
      const body = latin ? [...w].map((c) => `<i class="lt" style="animation-delay:${(li++ * 0.12).toFixed(2)}s">${esc(c)}</i>`).join("") : `<span dir="auto" style="unicode-bidi:plaintext">${esc(w)}</span>`;
      return `<span class="wd">${body}${bang}</span>`;
    })
    .join(" ")}</span>`;
}

export type Palette = { bg1: string; bg2: string; head: string; nameCss: string; shadow: string };

/** The text block shared by every template: "Happy Birthday" over "<Name>!" */
export function textBlock(name: string, p: Palette, top = 50, greeting = "Happy Birthday"): string {
  const b = bucket(name);
  return `<div class="tx" style="top:${top}%"><div class="hb">${esc(greeting)}</div><div class="nmw" style="font-size:${u(NAME_U[b])}">${nameHtml(name)}</div></div>`;
}

export const BASE = (p: Palette) => `
html,body{margin:0;background:#000;overflow:hidden}*{box-sizing:border-box}
#stage{position:relative;width:var(--w);height:var(--w);overflow:hidden;--u:calc(var(--w)/100);font-family:"DejaVu Sans","Noto Color Emoji",sans-serif;background:radial-gradient(120% 120% at 30% 15%,${p.bg1},${p.bg2})}
.tx{position:absolute;left:4%;right:4%;transform:translateY(-50%);text-align:center;z-index:10;animation:txbob ${L}s ease-in-out infinite}
.hb{font-weight:800;font-size:${u(HEAD_U)};letter-spacing:.03em;color:${p.head};text-shadow:${p.shadow}}
.nmw{font-weight:900;line-height:1.05;margin-top:${u(1)};${p.nameCss}}
.nm{display:inline;}
.wd{display:inline-block;white-space:nowrap}
.lt{display:inline-block;font-style:normal;animation:wave ${L / 2}s ease-in-out infinite}
.ex{display:inline-block;animation:wave ${L / 2}s ease-in-out infinite;animation-delay:.6s}
@keyframes wave{0%,100%{transform:translateY(0)}50%{transform:translateY(${u(-1.6)})}}
@keyframes txbob{0%,100%{transform:translateY(-50%) scale(1)}50%{transform:translateY(-50%) scale(1.035)}}
@keyframes tw{0%,100%{opacity:.15;transform:scale(.5)}50%{opacity:1;transform:scale(1.3)}}
@keyframes sway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
`;

export const doc = (css: string, inner: string, w: number | "fluid") =>
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><style>:root{--w:${w === "fluid" ? "100vmin" : `${w}px`}}${css}</style></head><body><div id="stage">${inner}</div></body></html>`;

