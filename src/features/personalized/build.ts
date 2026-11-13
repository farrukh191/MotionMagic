import { rng } from "./text";
import { getPersonalTemplate, normalizeName } from "./meta";
import { BASE, L, doc, textBlock, u, type Palette } from "./scene";
import { FESTIVAL_BUILDERS } from "./festival";
import { CONGRATS_BUILDERS } from "./congrats";
import { WEDDING_BUILDERS } from "./wedding";



/**
 * Template engine: every template is a complete, CSS-only animated scene with ONE text slot (the name).
 * The animation never depends on the name, only the size bucket of the text does, so a different name keeps the
 * original animation exactly. All animations are periodic over L seconds, so the GIF loops without a jump.
 */
/* ---------------- 1. Balloons ---------------- */
function balloons(name: string, w: number | "fluid", greeting: string): string {
  const p: Palette = { bg1: "#ffd6ec", bg2: "#8e7bff", head: "#ffffff", nameCss: "color:#fff;text-shadow:0 0 calc(var(--u)*2) #ff5fa2,0 calc(var(--u)*.6) calc(var(--u)*1.2) rgba(80,20,120,.55)", shadow: "0 calc(var(--u)*.5) calc(var(--u)*1.2) rgba(80,20,120,.55)" };
  const colors = ["#ff4d6d", "#ffd23f", "#4cc9f0", "#7bd88f", "#b980f0", "#ff9f1c", "#ff6fa5", "#5ee0c0"];
  const r = rng(11);
  const items = Array.from({ length: 12 }, (_, i) => {
    const c = colors[i % colors.length];
    const left = 3 + ((i * 8.3 + r() * 4) % 92);
    const s = 11 + r() * 5;
    return `<div class="bl" style="left:${left.toFixed(1)}%;width:${u(s)};height:${u(s * 1.22)};animation-delay:-${((((i * 5) % 12) * L) / 12).toFixed(2)}s;--c:${c};z-index:${i % 3 ? 4 : 12}"><i></i></div>`;
  }).join("");
  const clouds = [10, 55].map((t, i) => `<div class="cl" style="top:${t}%;animation-delay:-${i * (L / 2)}s"></div>`).join("");
  const css = BASE(p) + `
.bl{position:absolute;top:100%;border-radius:50% 50% 46% 46%;background:radial-gradient(circle at 32% 26%,#ffffffaa 0 8%,transparent 9%),radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--c),#fff 45%),var(--c) 55%,color-mix(in srgb,var(--c),#000 35%));box-shadow:inset ${u(-1)} ${u(-1.4)} ${u(2)} #0003;animation:rise ${L}s linear infinite}
.bl i{position:absolute;left:50%;top:99%;width:1px;height:${u(16)};background:#ffffffaa;transform-origin:50% 0;animation:sway ${L / 2}s ease-in-out infinite}
@keyframes rise{0%{transform:translateY(${u(20)})}100%{transform:translateY(${u(-150)})}}
.cl{position:absolute;left:-30%;width:${u(30)};height:${u(9)};border-radius:99px;background:#ffffff88;filter:blur(${u(1)});animation:drift ${L}s linear infinite}
@keyframes drift{to{transform:translateX(${u(160)})}}`;
  return doc(css, `${clouds}${items}${textBlock(name, p, 46, greeting)}`, w);
}

/* ---------------- 2. Cake ---------------- */
function cake(name: string, w: number | "fluid", greeting: string): string {
  const p: Palette = { bg1: "#4b2a7a", bg2: "#150a2b", head: "#ffe9a8", nameCss: "color:#ffd166;text-shadow:0 0 calc(var(--u)*2.5) #ff9f1c", shadow: "0 0 calc(var(--u)*2) #ff9f1c88" };
  const r = rng(5);
  const stars = Array.from({ length: 22 }, () => `<i class="st" style="left:${(r() * 98).toFixed(0)}%;top:${(r() * 98).toFixed(0)}%;animation-delay:-${(r() * L).toFixed(2)}s"></i>`).join("");
  const candles = [30, 50, 70].map((x, i) => `<div class="cd" style="left:${x}%"><b class="fl" style="animation-delay:-${i * 0.17}s"></b></div>`).join("");
  const css = BASE(p) + `
.st{position:absolute;width:${u(1.4)};height:${u(1.4)};border-radius:50%;background:#fff;box-shadow:0 0 ${u(2)} #ffd166;animation:tw ${L / 2}s ease-in-out infinite}
.ck{position:absolute;left:50%;bottom:${u(4)};width:${u(52)};height:${u(34)};transform:translateX(-50%);animation:ckb ${L / 2}s ease-in-out infinite}
@keyframes ckb{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(${u(-1.2)})}}
.pl{position:absolute;left:-8%;right:-8%;bottom:0;height:${u(3.5)};border-radius:99px;background:linear-gradient(#f4f1ff,#b9b2d6)}
.t1{position:absolute;left:0;right:0;bottom:${u(3)};height:${u(15)};border-radius:${u(2.5)};background:linear-gradient(#a8552e,#7a3a1d)}
.t2{position:absolute;left:12%;right:12%;bottom:${u(17)};height:${u(12)};border-radius:${u(2.5)};background:linear-gradient(#ff8fb8,#e0558a)}
.fr{position:absolute;left:12%;right:12%;bottom:${u(26.5)};height:${u(5)};border-radius:${u(2.5)} ${u(2.5)} ${u(4)} ${u(4)};background:repeating-linear-gradient(90deg,#fff 0 ${u(4)},#ffe3ef ${u(4)} ${u(7)});}
.cd{position:absolute;bottom:${u(31)};width:${u(2.4)};height:${u(9)};transform:translateX(-50%);border-radius:${u(1)};background:repeating-linear-gradient(135deg,#ffffff 0 ${u(1.6)},#5ec6ff ${u(1.6)} ${u(3.2)})}
.fl{position:absolute;left:50%;bottom:100%;width:${u(3)};height:${u(5.4)};margin-left:${u(-1.5)};border-radius:50% 50% 50% 50%/65% 65% 35% 35%;background:radial-gradient(circle at 50% 70%,#fff6b0,#ffb300 55%,#ff5a00);box-shadow:0 0 ${u(3.5)} #ffb300;transform-origin:50% 100%;animation:flk .5s ease-in-out infinite alternate}
@keyframes flk{from{transform:scale(1,1) rotate(-4deg)}to{transform:scale(.88,1.12) rotate(4deg)}}`;
  const cakeHtml = `<div class="ck"><div class="t1"></div><div class="t2"></div><div class="fr"></div>${candles}<div class="pl"></div></div>`;
  return doc(css, `${stars}${cakeHtml}${textBlock(name, p, 30, greeting)}`, w);
}

/* ---------------- 3. Flowers ---------------- */
function flowerSvg(petal: string, center: string): string {
  const petals = Array.from({ length: 8 }, (_, i) => `<ellipse cx="50" cy="22" rx="11" ry="21" fill="${petal}" transform="rotate(${i * 45} 50 50)"/>`).join("");
  return `<svg viewBox="0 0 100 100" width="100%" height="100%">${petals}<circle cx="50" cy="50" r="11" fill="${center}"/><circle cx="46" cy="46" r="3.5" fill="#ffffff66"/></svg>`;
}
function flowers(name: string, w: number | "fluid", greeting: string): string {
  const p: Palette = { bg1: "#fff1f6", bg2: "#ffb3cf", head: "#a3236a", nameCss: "color:#c2185b;text-shadow:0 calc(var(--u)*.4) calc(var(--u)*1.2) #ffffffcc", shadow: "0 calc(var(--u)*.3) calc(var(--u)*1) #ffffffcc" };
  const spots: [number, number, number, string, string][] = [
    [-6, -6, 34, "#ff7aa8", "#ffd166"], [72, -8, 30, "#ffa94d", "#fff3bf"], [-8, 70, 32, "#b388ff", "#ffe066"], [74, 72, 34, "#ff6b9a", "#fff3bf"],
    [38, -10, 20, "#ffb3d1", "#ff8fab"], [40, 90, 20, "#ffd6a5", "#ff9f1c"],
  ];
  const fl = spots.map(([x, y, s, pc, cc], i) => `<div class="fw" style="left:${x}%;top:${y}%;width:${u(s)};height:${u(s)};animation-delay:-${(i * L) / 6}s">${flowerSvg(pc, cc)}</div>`).join("");
  const r = rng(9);
  const petals = Array.from({ length: 14 }, (_, i) => `<i class="pt" style="left:${(r() * 96).toFixed(0)}%;animation-delay:-${((i * L) / 14).toFixed(2)}s;--s:${(1.6 + r() * 1.6).toFixed(1)}"></i>`).join("");
  const css = BASE(p) + `
.fw{position:absolute;animation:bloom ${L}s ease-in-out infinite;z-index:3}
@keyframes bloom{0%,100%{transform:scale(.92) rotate(-8deg)}50%{transform:scale(1.08) rotate(8deg)}}
.pt{position:absolute;top:-6%;width:calc(var(--u)*var(--s));height:calc(var(--u)*var(--s)*1.5);border-radius:50% 0 50% 50%;background:#ff9bbd;opacity:.85;animation:pfall ${L}s linear infinite;z-index:5}
@keyframes pfall{0%{transform:translate(0,0) rotate(0)}50%{transform:translate(${u(6)},${u(55)}) rotate(180deg)}100%{transform:translate(${u(-2)},${u(115)}) rotate(360deg)}}`;
  return doc(css, `${fl}${petals}${textBlock(name, p, 50, greeting)}`, w);
}

/* ---------------- 4. Confetti ---------------- */
function confetti(name: string, w: number | "fluid", greeting: string): string {
  const p: Palette = { bg1: "#5b3fd6", bg2: "#1b1058", head: "#ffffff", nameCss: "animation:hue " + L + "s linear infinite;color:#ffe066;text-shadow:0 0 calc(var(--u)*2) #ff4d9d", shadow: "0 calc(var(--u)*.5) calc(var(--u)*1.4) #0006" };
  const colors = ["#ff4d6d", "#ffd23f", "#4cc9f0", "#7bd88f", "#ff9f1c", "#ffffff", "#c77dff"];
  const r = rng(21);
  const bits = Array.from({ length: 38 }, (_, i) => {
    const sz = 1.6 + r() * 2;
    const shape = i % 3 === 0 ? "border-radius:50%" : i % 3 === 1 ? "" : `height:${u(sz * 0.5)}`;
    return `<i class="cf" style="left:${(r() * 98).toFixed(1)}%;width:${u(sz)};height:${u(sz * 1.3)};background:${colors[i % colors.length]};${shape};animation-delay:-${((i * L) / 38).toFixed(2)}s;animation-duration:${i % 2 ? L : L / 2}s"></i>`;
  }).join("");
  const streamers = [12, 88].map((x, i) => `<div class="sr" style="left:${x}%;animation-delay:-${i * 0.8}s"></div>`).join("");
  const css = BASE(p) + `
.cf{position:absolute;top:-6%;animation:cfall linear infinite;z-index:3}
@keyframes cfall{0%{transform:translateY(0) rotate(0) rotateY(0)}100%{transform:translateY(${u(118)}) rotate(360deg) rotateY(360deg)}}
.sr{position:absolute;top:-4%;width:${u(2.4)};height:${u(46)};border-radius:99px;background:repeating-linear-gradient(0deg,#ff4d9d 0 ${u(4)},#ffd23f ${u(4)} ${u(8)});transform-origin:50% 0;animation:sway ${L / 2}s ease-in-out infinite;opacity:.9}
@keyframes hue{to{filter:hue-rotate(360deg)}}`;
  return doc(css, `${streamers}${bits}${textBlock(name, p, 50, greeting)}`, w);
}

/* ---------------- 5. Golden ---------------- */
function golden(name: string, w: number | "fluid", greeting: string): string {
  const p: Palette = { bg1: "#3a2a08", bg2: "#0a0703", head: "#ffe9a8", nameCss: "color:#ffd45e;text-shadow:0 0 calc(var(--u)*2) #f5c542,0 calc(var(--u)*.5) calc(var(--u)*1) #7a5200;animation:gbright " + (L / 2) + "s ease-in-out infinite", shadow: "0 0 calc(var(--u)*2) #f5c54299" };
  const r = rng(33);
  const glitter = Array.from({ length: 34 }, () => `<i class="gl" style="left:${(r() * 98).toFixed(0)}%;top:${(r() * 98).toFixed(0)}%;width:${u(0.9 + r() * 1.3)};height:${u(0.9 + r() * 1.3)};animation-delay:-${(r() * L).toFixed(2)}s"></i>`).join("");
  const css = BASE(p) + `
.rays{position:absolute;left:-50%;top:-50%;width:200%;height:200%;background:repeating-conic-gradient(from 0deg,#f5c54228 0 7deg,transparent 7deg 15deg);animation:spin ${L * 4}s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.vg{position:absolute;inset:0;background:radial-gradient(circle,transparent 30%,#0a0703dd 100%)}
.fm{position:absolute;inset:${u(3)};border:${u(0.9)} solid #e8b923;border-radius:${u(3)};box-shadow:inset 0 0 ${u(4)} #f5c54266,0 0 ${u(3)} #f5c54266;animation:fmg ${L / 2}s ease-in-out infinite}
.fm::before{content:"";position:absolute;inset:${u(1.6)};border:${u(0.3)} solid #f5c542aa;border-radius:${u(2)}}
@keyframes fmg{0%,100%{opacity:.75}50%{opacity:1}}
.gl{position:absolute;border-radius:50%;background:#fff3b0;box-shadow:0 0 ${u(2.2)} #f5c542;animation:tw ${L / 2}s ease-in-out infinite}
@keyframes gbright{0%,100%{filter:brightness(1)}50%{filter:brightness(1.3)}}`;
  return doc(css, `<div class="rays"></div><div class="vg"></div><div class="fm"></div>${glitter}${textBlock(name, p, 50, greeting)}`, w);
}

const BUILDERS: Record<string, (name: string, w: number | "fluid", greeting: string) => string> = { balloons, cake, flowers, confetti, golden, ...FESTIVAL_BUILDERS, ...CONGRATS_BUILDERS, ...WEDDING_BUILDERS, };

/**
 * Builds the complete scene for a template and a name.
 * size = canvas in pixels for the GIF renderer, or "fluid" to fill whatever box it is shown in (live browser preview).
 */
export function buildPersonalDocument(templateId: string, rawName: string, size: number | "fluid"): string {
  const t = getPersonalTemplate(templateId);
  if (!t) throw new Error(`Unknown template ${templateId}`);
  const build = BUILDERS[t.id];
  if (!build) throw new Error(`Template ${t.id} has no scene yet`);
  const name = normalizeName(rawName);
  if (!name) throw new Error("A name is required");
  return build(name, size, t.greeting);
}
