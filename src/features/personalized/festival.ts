import { rng } from "./text";
import { BASE, L, doc, textBlock, u, type Palette } from "./scene";

/**
 * Festival designs. Same rules as every template: CSS-only, no external files, one text slot (the greeting + the name),
 * every animation repeats every L seconds (or L/2, L/4...) so the GIF loops without a jump.
 */
type W = number | "fluid";
type Builder = (name: string, w: W, greeting: string) => string;

const pal = (bg1: string, bg2: string, head: string, name: string, glow: string): Palette => ({
  bg1,
  bg2,
  head,
  nameCss: `color:${name};text-shadow:0 0 calc(var(--u)*2) ${glow},0 calc(var(--u)*.5) calc(var(--u)*1) rgba(0,0,0,.45)`,
  shadow: `0 calc(var(--u)*.4) calc(var(--u)*1) rgba(0,0,0,.5)`,
});
const f1 = (n: number) => n.toFixed(1);
const dly = (i: number, n: number) => `-${((i * L) / n).toFixed(2)}s`;
const STAR = "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)";

/** Twinkling stars. */
function stars(seed: number, n: number, maxTop = 100, color = "#fff", glow = "#bcd2ff"): string {
  const r = rng(seed);
  return Array.from({ length: n }, () => `<i class="sx" style="left:${f1(r() * 98)}%;top:${f1(r() * maxTop)}%;width:${u(0.7 + r() * 1.2)};height:${u(0.7 + r() * 1.2)};background:${color};box-shadow:0 0 ${u(1.6)} ${glow};animation-delay:-${(r() * L).toFixed(2)}s"></i>`).join("");
}
const STARS_CSS = `.sx{position:absolute;border-radius:50%;animation:tw ${L / 2}s ease-in-out infinite}`;

/** Particle burst shared by fireworks and holi powder. Particles fly out of a point and fade. */
const BURST_CSS = `
.bu{position:absolute;width:0;height:0}
.bp{position:absolute;left:0;top:0;border-radius:50%;background:var(--c);box-shadow:0 0 ${u(1.6)} var(--c);animation:bst ${L}s ease-out infinite}
@keyframes bst{0%{transform:rotate(var(--a)) translateY(0) scale(.5);opacity:0}6%{opacity:1}55%{transform:rotate(var(--a)) translateY(calc(var(--u)*var(--d)*-1)) scale(1);opacity:1}78%,100%{transform:rotate(var(--a)) translateY(calc(var(--u)*var(--d)*-1.18)) scale(.35);opacity:0}}`;
function burst(x: number, y: number, colors: string[], count: number, dist: number, size: number, delay: string): string {
  const parts = Array.from({ length: count }, (_, i) => `<i class="bp" style="--a:${((360 / count) * i).toFixed(1)}deg;--d:${dist + (i % 2) * 2.5};--c:${colors[i % colors.length]};width:${u(size)};height:${u(size)};animation-delay:${delay}"></i>`).join("");
  return `<div class="bu" style="left:${x}%;top:${y}%">${parts}</div>`;
}

/* ---------- 1. Eid Moon Glow ---------- */
function eidMoon(name: string, w: W, greeting: string): string {
  const p = pal("#1c3aa9", "#050b2e", "#fff4c2", "#ffd45e", "#ffb703");
  const css = BASE(p) + STARS_CSS + `
.mw{position:absolute;right:9%;top:5%;width:${u(24)};height:${u(24)};transform:rotate(-18deg)}
.mn{width:100%;height:100%;border-radius:50%;box-shadow:inset ${u(-5.5)} ${u(1)} 0 0 #ffd45e;filter:drop-shadow(0 0 ${u(3)} #ffb703);transform-origin:50% 0;animation:sway ${L}s ease-in-out infinite}
.sr{position:absolute;right:30%;top:14%;width:${u(7)};height:${u(7)};background:#ffd45e;clip-path:${STAR};filter:drop-shadow(0 0 ${u(1.5)} #ffb703);animation:tw ${L / 2}s ease-in-out infinite}
.hl{position:absolute;left:-10%;right:-10%;bottom:${u(-14)};height:${u(26)};border-radius:50%;background:#08154f;box-shadow:0 ${u(-2)} ${u(6)} #3b5bdb55}
.hl2{position:absolute;left:30%;right:-30%;bottom:${u(-18)};height:${u(26)};border-radius:50%;background:#0b1c63}
.sh{position:absolute;left:8%;top:8%;width:${u(14)};height:${u(.45)};border-radius:9px;background:linear-gradient(90deg,transparent,#fff);transform-origin:100% 50%;animation:shoot ${L}s linear infinite}
@keyframes shoot{0%{transform:translate(0,0) rotate(28deg);opacity:0}8%{opacity:1}40%{transform:translate(${u(34)},${u(18)}) rotate(28deg);opacity:0}100%{transform:translate(${u(34)},${u(18)}) rotate(28deg);opacity:0}}`;
  return doc(css, `${stars(21, 30, 62)}<div class="sh"></div><div class="mw"><div class="mn"></div></div><i class="sr"></i><div class="hl2"></div><div class="hl"></div>${textBlock(name, p, 58, greeting)}`, w);
}

/* ---------- 2. Eid Lanterns ---------- */
function eidLanterns(name: string, w: W, greeting: string): string {
  const p = pal("#0f8f84", "#031f1d", "#fff1c1", "#ffe08a", "#ffb703");
  const spec: [number, number, string][] = [[10, 17, "#ffb703"], [30, 27, "#ff6b8b"], [50, 14, "#ffd166"], [70, 29, "#4cc9f0"], [90, 19, "#ff9f1c"]];
  const lanterns = spec
    .map(([x, h, c], i) => `<div class="ln" style="left:${x}%;animation-delay:${dly(i * 2, 10)}"><i class="ls" style="height:${u(h)}"></i><div class="lb" style="--c:${c}"><b class="cap"></b><b class="bd"></b><b class="ft"></b></div></div>`)
    .join("");
  const r = rng(8);
  const bokeh = Array.from({ length: 14 }, () => `<i class="bk" style="left:${f1(r() * 96)}%;top:${f1(35 + r() * 62)}%;width:${u(3 + r() * 7)};height:${u(3 + r() * 7)};animation-delay:-${(r() * L).toFixed(2)}s"></i>`).join("");
  const css = BASE(p) + `
.bk{position:absolute;border-radius:50%;background:radial-gradient(circle,#ffe08a66,transparent 70%);animation:tw ${L}s ease-in-out infinite}
.ln{position:absolute;top:0;width:0;transform-origin:50% 0;animation:sway ${L}s ease-in-out infinite}
.ls{position:absolute;left:0;top:0;width:${u(.45)};margin-left:${u(-.22)};background:#ffe08a}
.lb{position:absolute;left:${u(-5.5)};width:${u(11)};height:${u(17)}}
.lb::before{content:"";position:absolute;left:50%;top:${u(-2)};width:${u(1.4)};height:${u(2.4)};margin-left:${u(-.7)};background:#ffe08a}
.cap{position:absolute;left:12%;right:12%;top:0;height:${u(3.6)};background:linear-gradient(#ffe08a,#b8860b);clip-path:polygon(18% 0,82% 0,100% 100%,0 100%)}
.bd{position:absolute;left:0;right:0;top:${u(3.2)};bottom:${u(2.8)};border-radius:${u(2)};background:repeating-linear-gradient(90deg,#0004 0 ${u(.5)},transparent ${u(.5)} ${u(2.6)}),radial-gradient(circle at 50% 55%,#fff7c8,var(--c) 62%,color-mix(in srgb,var(--c),#000 40%));box-shadow:0 0 ${u(5)} var(--c);animation:lg ${L / 2}s ease-in-out infinite}
.ft{position:absolute;left:24%;right:24%;bottom:0;height:${u(3)};background:linear-gradient(#b8860b,#7a5200);clip-path:polygon(0 0,100% 0,78% 100%,22% 100%)}
@keyframes lg{0%,100%{filter:brightness(.9)}50%{filter:brightness(1.25)}}`;
  return doc(css, `${bokeh}${lanterns}${textBlock(name, p, 64, greeting)}`, w);
}

/* ---------- 3. Ramadan Nights ---------- */
function ramadan(name: string, w: W, greeting: string): string {
  const p = pal("#5b21b6", "#12043a", "#f5e6ff", "#ffd98a", "#ffb703");
  const r = rng(31);
  const win = Array.from({ length: 12 }, (_, i) => `<i class="wn" style="left:${f1(6 + r() * 88)}%;bottom:${f1(1 + r() * 9)}%;animation-delay:${dly(i, 12)}"></i>`).join("");
  const mosque = `<svg class="ms" viewBox="0 0 100 34" preserveAspectRatio="none"><path fill="#0d0328" d="M0 34V26H6V14L8 9L10 14V26H20V22Q20 14 30 14Q40 14 40 22V26H44V20Q44 6 50 4Q56 6 56 20V26H60V22Q60 14 70 14Q80 14 80 22V26H90V14L92 9L94 14V26H100V34Z"/><path stroke="#0d0328" stroke-width=".6" d="M50 4V0M8 9V5M92 9V5"/></svg>`;
  const css = BASE(p) + STARS_CSS + `
.ms{position:absolute;left:0;bottom:0;width:100%;height:${u(34)}}
.wn{position:absolute;width:${u(1.3)};height:${u(2.2)};border-radius:${u(.6)} ${u(.6)} 0 0;background:#ffd166;box-shadow:0 0 ${u(1.5)} #ffb703;animation:tw ${L / 2}s ease-in-out infinite}
.mw{position:absolute;left:8%;top:6%;width:${u(20)};height:${u(20)};transform:rotate(-24deg)}
.mn{width:100%;height:100%;border-radius:50%;box-shadow:inset ${u(-4.6)} 0 0 0 #ffd98a;filter:drop-shadow(0 0 ${u(3)} #ffb703);animation:tw ${L}s ease-in-out infinite}
.hg{position:absolute;left:${u(24)};top:${u(0)};width:${u(.35)};height:${u(18)};background:linear-gradient(#ffd98a,transparent);transform-origin:50% 0;animation:sway ${L}s ease-in-out infinite}
.hg::after{content:"";position:absolute;left:${u(-1.6)};bottom:${u(-3)};width:${u(3.6)};height:${u(3.6)};background:#ffd98a;clip-path:${STAR};filter:drop-shadow(0 0 ${u(1.4)} #ffb703)}
.gl{position:absolute;left:20%;right:20%;top:30%;height:${u(30)};border-radius:50%;background:radial-gradient(ellipse,#a855f755,transparent 70%);animation:tw ${L}s ease-in-out infinite}`;
  return doc(css, `${stars(33, 34, 55)}<div class="gl"></div><div class="mw"><div class="mn"></div></div><div class="hg"></div>${mosque}${win}${textBlock(name, p, 40, greeting)}`, w);
}

/* ---------- 4. Golden star pattern (Eid ul Adha) ---------- */
function adha(name: string, w: W, greeting: string): string {
  const p = pal("#0a7a5b", "#021a14", "#fff1c1", "#ffe08a", "#f5c542");
  const r = rng(44);
  const dots = Array.from({ length: 26 }, () => `<i class="gd" style="left:${f1(r() * 98)}%;top:${f1(r() * 98)}%;animation-delay:-${(r() * L).toFixed(2)}s"></i>`).join("");
  const css = BASE(p) + `
.pt{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 0 6%,#0000 7%),repeating-conic-gradient(from 0deg at 50% 50%,#ffffff0d 0 7.5deg,transparent 7.5deg 15deg)}
.sq{position:absolute;left:50%;top:50%;width:${u(60)};height:${u(60)};margin:${u(-30)} 0 0 ${u(-30)};border:${u(.9)} solid #f5c542;box-shadow:0 0 ${u(3)} #f5c54288,inset 0 0 ${u(3)} #f5c54255;animation:sq ${L}s linear infinite}
.sq.b{animation-name:sqb}
@keyframes sq{from{transform:rotate(0)}to{transform:rotate(90deg)}}
@keyframes sqb{from{transform:rotate(45deg)}to{transform:rotate(135deg)}}
.rg{position:absolute;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%)}
.r1{width:${u(94)};height:${u(94)};background:repeating-conic-gradient(#f5c542 0 3deg,transparent 3deg 12deg);-webkit-mask:radial-gradient(circle,transparent 62%,#000 63%,#000 66%,transparent 67%);mask:radial-gradient(circle,transparent 62%,#000 63%,#000 66%,transparent 67%);animation:rr ${L}s linear infinite}
.r2{width:${u(52)};height:${u(52)};border:${u(.5)} solid #f5c54299;box-shadow:0 0 ${u(3)} #f5c54266}
@keyframes rr{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(12deg)}}
.dm{position:absolute;left:50%;top:50%;width:${u(58)};height:${u(58)};transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#03251dee 40%,#03251d00 72%)}
.gd{position:absolute;width:${u(1.3)};height:${u(1.3)};background:#ffe08a;transform:rotate(45deg);box-shadow:0 0 ${u(1.6)} #f5c542;animation:tw ${L / 2}s ease-in-out infinite}`;
  return doc(css, `<div class="pt"></div><div class="rg r1"></div><div class="rg r2"></div><div class="sq"></div><div class="sq b"></div><div class="dm"></div>${dots}${textBlock(name, p, 50, greeting)}`, w);
}

/* ---------- 5. Independence Day (green and white) ---------- */
function independence(name: string, w: W, greeting: string): string {
  const p = pal("#0f8a3c", "#012712", "#ffffff", "#ffffff", "#34d399");
  const flags = Array.from({ length: 11 }, (_, i) => {
    const y = 2 + 4.5 * Math.sin((Math.PI * i) / 10);
    return `<i class="fg" style="left:${f1(i * 9.4 - 1)}%;top:${f1(y)}%;background:${i % 2 ? "#ffffff" : "#1fae5b"};animation-delay:${dly(i % 4, 4)}"></i>`;
  }).join("");
  const r = rng(14);
  const conf = Array.from({ length: 26 }, (_, i) => `<i class="cf" style="left:${f1(r() * 98)}%;width:${u(1 + r() * 1)};height:${u(1.8 + r() * 1.6)};background:${i % 2 ? "#fff" : "#4ade80"};animation-delay:-${(r() * L).toFixed(2)}s;--dx:${f1(r() * 10 - 5)}"></i>`).join("");
  const css = BASE(p) + `
.sg{position:absolute;left:-5%;right:-5%;top:${u(5)};height:${u(.4)};background:#ffffffbb}
.fg{position:absolute;width:${u(8.6)};height:${u(11)};clip-path:polygon(0 0,100% 0,50% 100%);transform-origin:50% 0;animation:sway ${L / 2}s ease-in-out infinite}
.cf{position:absolute;top:0;border-radius:${u(.3)};opacity:.9;animation:cfall ${L}s linear infinite}
@keyframes cfall{0%{transform:translate(0,${u(-6)}) rotate(0)}100%{transform:translate(calc(var(--u)*var(--dx)),${u(106)}) rotate(360deg)}}
.cw{position:absolute;left:50%;top:15%;width:${u(24)};height:${u(24)};margin-left:${u(-16)};animation:glo ${L / 2}s ease-in-out infinite}
.cm{width:100%;height:100%;border-radius:50%;box-shadow:inset ${u(-5)} 0 0 0 #fff;transform:rotate(-30deg)}
.sr{position:absolute;left:62%;top:20%;width:${u(11)};height:${u(11)};background:#fff;clip-path:${STAR};transform:rotate(15deg);animation:glo ${L / 2}s ease-in-out infinite}
@keyframes glo{0%,100%{filter:drop-shadow(0 0 ${u(1.2)} #ffffff88)}50%{filter:drop-shadow(0 0 ${u(3)} #fff)}}
.sh{position:absolute;left:-20%;right:-20%;bottom:${u(-18)};height:${u(26)};border-radius:50%;background:#06521f}`;
  return doc(css, `<div class="sh"></div>${conf}<div class="cw"><div class="cm"></div></div><i class="sr"></i><div class="sg"></div>${flags}${textBlock(name, p, 62, greeting)}`, w);
}

/* ---------- 6. Diwali Diyas ---------- */
function diwali(name: string, w: W, greeting: string): string {
  const p = pal("#9a3412", "#1c0702", "#ffe7b3", "#ffc94d", "#ff8a00");
  const xs = [12, 31, 50, 69, 88];
  const diyas = xs.map((x, i) => `<div class="hl" style="left:${x}%;bottom:${u(i % 2 ? 4 : 9)}"></div><div class="dy" style="left:${x}%;bottom:${u(i % 2 ? 6 : 11)}"><i class="fm" style="animation-delay:${dly(i, 10)}"></i></div>`).join("");
  const r = rng(61);
  const sparks = Array.from({ length: 26 }, () => `<i class="sp" style="left:${f1(r() * 98)}%;top:${f1(55 + r() * 40)}%;width:${u(0.6 + r() * 0.9)};height:${u(0.6 + r() * 0.9)};animation-delay:-${(r() * L).toFixed(2)}s"></i>`).join("");
  const css = BASE(p) + `
.dy{position:absolute;width:${u(15)};height:${u(7.5)};margin-left:${u(-7.5)};border-radius:0 0 ${u(8)} ${u(8)};background:linear-gradient(#f59e0b,#b45309 60%,#6b2d0a);box-shadow:inset 0 ${u(.7)} 0 #fde68a66,0 ${u(1)} ${u(2)} #0008}
.dy::before{content:"";position:absolute;left:0;right:0;top:${u(-1.3)};height:${u(2.8)};border-radius:50%;background:#451a03;border:${u(.35)} solid #f59e0b}
.fm{position:absolute;left:50%;bottom:100%;width:${u(3)};height:${u(6.4)};margin:0 0 ${u(-.4)} ${u(-1.5)};border-radius:50% 50% 50% 50%/65% 65% 35% 35%;background:radial-gradient(circle at 50% 70%,#fff8c4,#ffb300 55%,#ff5a00);box-shadow:0 0 ${u(4)} #ffb300;transform-origin:50% 100%;animation:dfl .5s ease-in-out infinite alternate}
@keyframes dfl{from{transform:scale(1,1) rotate(-4deg)}to{transform:scale(.88,1.14) rotate(4deg)}}
.hl{position:absolute;width:${u(30)};height:${u(30)};margin-left:${u(-15)};margin-bottom:${u(-6)};border-radius:50%;background:radial-gradient(circle,#ffb30055,transparent 68%);animation:tw ${L / 2}s ease-in-out infinite}
.sp{position:absolute;border-radius:50%;background:#ffd166;box-shadow:0 0 ${u(1.4)} #ff9f1c;animation:up ${L}s linear infinite}
@keyframes up{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(${u(-55)});opacity:0}}
.gar{position:absolute;left:-4%;right:-4%;top:${u(-6)};height:${u(16)};border-radius:0 0 50% 50%/0 0 100% 100%;border-bottom:${u(2.8)} dotted #fb923c;filter:drop-shadow(0 0 ${u(.8)} #ff9f1c)}
.gar.b{top:${u(-9)};border-bottom-color:#fbbf24;animation:sway ${L}s ease-in-out infinite;transform-origin:50% 0}`;
  return doc(css, `<div class="gar"></div><div class="gar b"></div>${sparks}${diyas}${textBlock(name, p, 36, greeting)}`, w);
}

/* ---------- 7. New Year fireworks ---------- */
function newYear(name: string, w: W, greeting: string): string {
  const p = pal("#12184a", "#02030f", "#ffffff", "#ffd45e", "#ffb703");
  const set: [number, number, string[]][] = [
    [22, 22, ["#ff4d6d", "#ffd23f"]],
    [76, 18, ["#4cc9f0", "#ffffff"]],
    [50, 32, ["#7bd88f", "#ffd23f", "#ff6fa5"]],
    [12, 46, ["#b980f0", "#ff9f1c"]],
    [88, 44, ["#ff6fa5", "#ffffff"]],
  ];
  const bursts = set.map(([x, y, c], i) => burst(x, y, c, 16, 15 + (i % 3) * 2, 1.2, dly(i * 2, 10))).join("");
  const css = BASE(p) + STARS_CSS + BURST_CSS + `
.cty{position:absolute;left:0;right:0;bottom:0;height:${u(14)};background:linear-gradient(90deg,#070a2a 0 8%,#0a0f3a 8% 14%,#070a2a 14% 26%,#0b1140 26% 31%,#070a2a 31% 46%,#0a0f3a 46% 55%,#070a2a 55% 70%,#0b1140 70% 78%,#070a2a 78% 90%,#0a0f3a 90%);clip-path:polygon(0 40%,8% 40%,8% 15%,14% 15%,14% 55%,26% 55%,26% 25%,31% 25%,31% 60%,46% 60%,46% 10%,55% 10%,55% 50%,70% 50%,70% 30%,78% 30%,78% 55%,90% 55%,90% 20%,100% 20%,100% 100%,0 100%)}`;
  return doc(css, `${stars(70, 22, 60)}${bursts}<div class="cty"></div>${textBlock(name, p, 64, greeting)}`, w);
}

/* ---------- 8. Christmas snow ---------- */
function christmas(name: string, w: W, greeting: string): string {
  const p = pal("#1e5a96", "#06182c", "#ffffff", "#fff3b0", "#ff4d4d");
  const r = rng(25);
  const snow = Array.from({ length: 38 }, (_, i) => `<i class="sn" style="left:${f1(r() * 100)}%;width:${u(0.8 + r() * 1.5)};height:${u(0.8 + r() * 1.5)};animation-duration:${i % 4 ? L : L / 2}s;animation-delay:-${(r() * L).toFixed(2)}s;--dx:${f1(r() * 8 - 4)}"></i>`).join("");
  const lights: [number, number][] = [[46, 30], [54, 38], [38, 52], [62, 56], [30, 74], [50, 70], [70, 78], [42, 88], [60, 90]];
  const lc = ["#ff4d6d", "#ffd23f", "#4cc9f0", "#7bd88f", "#ff9f1c"];
  const bulbs = lights.map(([x, y], i) => `<i class="bl" style="left:${x}%;top:${y}%;background:${lc[i % 5]};color:${lc[i % 5]};animation-delay:${dly(i, 9)}"></i>`).join("");
  const css = BASE(p) + `
.sn{position:absolute;top:0;border-radius:50%;background:#fff;filter:blur(${u(.15)});animation:snf linear infinite}
@keyframes snf{0%{transform:translate(0,${u(-6)})}100%{transform:translate(calc(var(--u)*var(--dx)),${u(108)})}}
.tr{position:absolute;left:50%;bottom:${u(5)};width:${u(36)};height:${u(42)};margin-left:${u(-18)}}
.tr b{position:absolute;display:block;clip-path:polygon(50% 0,100% 100%,0 100%);background:linear-gradient(#2fbf5b,#0f6b30)}
.a{left:25%;width:50%;top:0;height:36%}.b{left:14%;width:72%;top:24%;height:38%}.c{left:3%;width:94%;top:48%;height:42%}
.tk{position:absolute;left:43%;width:14%;bottom:0;height:10%;background:#7a4a1d}
.sr{position:absolute;left:50%;top:${u(-5)};width:${u(7)};height:${u(7)};margin-left:${u(-3.5)};background:#ffe066;clip-path:${STAR};filter:drop-shadow(0 0 ${u(1.6)} #ffd23f);animation:tw ${L / 2}s ease-in-out infinite}
.bl{position:absolute;width:${u(2)};height:${u(2)};border-radius:50%;box-shadow:0 0 ${u(2)} currentColor;animation:blk ${L / 2}s ease-in-out infinite}
@keyframes blk{0%,100%{opacity:.35}50%{opacity:1}}
.gd{position:absolute;left:-5%;right:-5%;bottom:${u(-8)};height:${u(18)};border-radius:50%;background:#eaf4ff;box-shadow:0 ${u(-1)} ${u(5)} #9ec9ff}`;
  const tree = `<div class="tr"><b class="a"></b><b class="b"></b><b class="c"></b><i class="tk"></i><i class="sr"></i></div>`;
  const bulbWrap = `<div class="tr">${bulbs}</div>`;
  return doc(css, `${snow}<div class="gd"></div>${tree}${bulbWrap}${textBlock(name, p, 30, greeting)}`, w);
}

/* ---------- 9. Holi colours ---------- */
function holi(name: string, w: W, greeting: string): string {
  const p = pal("#4c1d95", "#14052e", "#ffffff", "#ffffff", "#ff3df0");
  const blobs: [number, number, number, string, number, number][] = [
    [-10, -8, 62, "#ff2d95", 8, 6], [58, -12, 58, "#ffd400", -8, 8], [-14, 50, 60, "#00e0ff", 9, -7], [56, 54, 62, "#7dff3a", -7, -8], [30, 22, 46, "#b14dff", 5, 7],
  ];
  const bl = blobs.map(([x, y, s, c, dx, dy], i) => `<i class="bb" style="left:${x}%;top:${y}%;width:${u(s)};height:${u(s)};--c:${c};--x:${dx};--y:${dy};animation-delay:${dly(i, 5)}"></i>`).join("");
  const bursts = [
    burst(0, 0, ["#ff2d95", "#ffd400", "#00e0ff"], 18, 36, 2.2, "0s"),
    burst(100, 0, ["#7dff3a", "#ff9f1c", "#b14dff"], 18, 36, 2.2, dly(1, 4)),
    burst(0, 100, ["#ffd400", "#ff2d95", "#7dff3a"], 18, 36, 2.2, dly(2, 4)),
    burst(100, 100, ["#00e0ff", "#b14dff", "#ff2d95"], 18, 36, 2.2, dly(3, 4)),
  ].join("");
  const css = BASE(p) + BURST_CSS + `
.bb{position:absolute;border-radius:50%;background:radial-gradient(circle,var(--c) 0,transparent 68%);filter:blur(${u(1.5)});opacity:.9;animation:bf ${L}s ease-in-out infinite}
@keyframes bf{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(calc(var(--u)*var(--x)),calc(var(--u)*var(--y))) scale(1.22)}}
.dm{position:absolute;left:10%;right:10%;top:34%;height:32%;border-radius:50%;background:radial-gradient(ellipse,#1a0636cc 30%,transparent 72%)}`;
  return doc(css, `${bl}${bursts}<div class="dm"></div>${textBlock(name, p, 50, greeting)}`, w);
}

/* ---------- 10. Basant kites ---------- */
function basant(name: string, w: W, greeting: string): string {
  const p = pal("#1d9bf0", "#c9ecff", "#ffffff", "#ffffff", "#0b5394");
  p.shadow = "0 calc(var(--u)*.4) calc(var(--u)*1) rgba(8,60,120,.7)";
  const kites: [number, number, string, number][] = [[10, 8, "#ffd23f", 13], [32, 20, "#ff4d6d", 11], [58, 6, "#ff9f1c", 12], [80, 18, "#b980f0", 13], [20, 62, "#34d399", 11], [74, 60, "#ff6fa5", 12]];
  const k = kites.map(([x, y, c, s], i) => `<div class="kt" style="left:${x}%;top:${y}%;animation-delay:${dly(i, 6)}"><div class="kb" style="--c:${c};width:${u(s)};height:${u(s * 1.25)}"></div><i class="tl" style="--c:${c}"></i></div>`).join("");
  const clouds = [9, 27, 84].map((t, i) => `<div class="cl" style="top:${t}%;animation-delay:-${i * (L / 3)}s"></div>`).join("");
  const css = BASE(p) + `
.sun{position:absolute;right:6%;top:4%;width:${u(16)};height:${u(16)};border-radius:50%;background:radial-gradient(circle,#fff7b0,#ffd23f 60%,#ffb703);box-shadow:0 0 ${u(8)} #ffe58a;animation:tw ${L}s ease-in-out infinite}
.cl{position:absolute;left:-30%;width:${u(30)};height:${u(8)};border-radius:99px;background:#ffffffcc;filter:blur(${u(.6)});animation:drift ${L}s linear infinite}
@keyframes drift{to{transform:translateX(${u(160)})}}
.kt{position:absolute;width:0;height:0;animation:kb ${L}s ease-in-out infinite}
@keyframes kb{0%,100%{transform:translate(0,0) rotate(-6deg)}50%{transform:translate(${u(4)},${u(-4)}) rotate(6deg)}}
.kb{position:absolute;left:0;top:0;transform:translateX(-50%);clip-path:polygon(50% 0,100% 40%,50% 100%,0 40%);background:linear-gradient(90deg,var(--c) 50%,color-mix(in srgb,var(--c),#000 28%) 50%)}
.kb::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:${u(.3)};background:#ffffffaa}
.kb::after{content:"";position:absolute;left:0;right:0;top:40%;height:${u(.3)};background:#ffffffaa}
.tl{position:absolute;left:${u(-.6)};top:${u(15)};width:${u(1.2)};height:${u(14)};background:repeating-linear-gradient(180deg,var(--c) 0 ${u(1.3)},transparent ${u(1.3)} ${u(2.8)});transform-origin:50% 0;animation:sway ${L / 2}s ease-in-out infinite}`;
  return doc(css, `<div class="sun"></div>${clouds}${k}${textBlock(name, p, 52, greeting)}`, w);
}

/* ---------- 11. Halloween night ---------- */
function halloween(name: string, w: W, greeting: string): string {
  const p = pal("#3b1a73", "#0a0614", "#e9d5ff", "#ff9f1c", "#ff6a00");
  const bat = `<svg viewBox="0 0 40 20"><path fill="#07030f" d="M20 10C16 4 8 2 0 6C6 7 8 11 10 15C13 12 16 12 20 18C24 12 27 12 30 15C32 11 34 7 40 6C32 2 24 4 20 10Z"/></svg>`;
  const bats = [8, 20, 31, 13, 26].map((t, i) => `<div class="bt" style="top:${t}%;width:${u(7 + (i % 3))};animation-delay:${dly(i * 2, 10)}">${bat}</div>`).join("");
  const pumpkins: [number, number][] = [[15, 17], [50, 21], [85, 17]];
  const pk = pumpkins.map(([x, s], i) => `<div class="pk" style="left:${x}%;width:${u(s)};height:${u(s * 0.82)};animation-delay:${dly(i, 3)}"><i class="ey l"></i><i class="ey r"></i><i class="mt"></i></div>`).join("");
  const css = BASE(p) + `
.mn{position:absolute;right:7%;top:4%;width:${u(34)};height:${u(34)};border-radius:50%;background:radial-gradient(circle at 40% 35%,#ffe1a8,#ffa94d 55%,#e8590c);box-shadow:0 0 ${u(10)} #ff9f1c88;animation:tw ${L}s ease-in-out infinite}
.fg{position:absolute;left:-10%;right:-10%;bottom:${u(-4)};height:${u(22)};background:radial-gradient(ellipse at 50% 100%,#9d7bd8aa,transparent 70%);animation:tw ${L}s ease-in-out infinite}
.bt{position:absolute;left:0;animation:fly ${L}s linear infinite}
.bt svg{display:block;width:100%;transform-origin:50% 60%;animation:flap .5s ease-in-out infinite alternate}
@keyframes fly{0%{transform:translateX(${u(-14)})}100%{transform:translateX(${u(112)})}}
@keyframes flap{from{transform:scaleY(1)}to{transform:scaleY(.5)}}
.pk{position:absolute;bottom:${u(2)};transform:translateX(-50%);border-radius:50% 50% 45% 45%;background:radial-gradient(circle at 38% 32%,#ffb366,#f76707 58%,#a63d00);box-shadow:0 0 ${u(5)} #ff6a0077;animation:pg ${L / 2}s ease-in-out infinite}
.pk::before{content:"";position:absolute;left:46%;top:${u(-2.4)};width:${u(2.2)};height:${u(3.6)};border-radius:${u(.8)};background:#4d7c0f;transform:rotate(10deg)}
.ey{position:absolute;top:30%;width:15%;height:20%;background:#ffe066;clip-path:polygon(50% 0,100% 100%,0 100%);box-shadow:0 0 ${u(2)} #ffd23f}
.ey.l{left:24%}.ey.r{right:24%}
.mt{position:absolute;left:24%;right:24%;top:58%;height:22%;background:#ffe066;clip-path:polygon(0 0,12% 45%,25% 0,37% 45%,50% 0,62% 45%,75% 0,87% 45%,100% 0,100% 55%,88% 100%,12% 100%,0 55%)}
@keyframes pg{0%,100%{filter:brightness(.9)}50%{filter:brightness(1.2)}}`;
  return doc(css, `${stars(81, 18, 40, "#fff", "#c4b5fd")}<div class="mn"></div>${bats}<div class="fg"></div>${pk}${textBlock(name, p, 42, greeting)}`, w);
}

/* ---------- 12. Lunar New Year ---------- */
function lunar(name: string, w: W, greeting: string): string {
  const p = pal("#c81e1e", "#3a0606", "#ffe9a8", "#ffd45e", "#ffb703");
  const r = rng(52);
  const coins = Array.from({ length: 16 }, (_, i) => `<div class="cw" style="left:${f1(r() * 94)}%;animation-delay:-${(r() * L).toFixed(2)}s;--dx:${f1(r() * 8 - 4)}"><i class="cn" style="width:${u(4.4 + r() * 2)};height:${u(4.4 + r() * 2)};animation-delay:-${(i * 0.3).toFixed(2)}s"></i></div>`).join("");
  const sp = Array.from({ length: 22 }, () => `<i class="gd" style="left:${f1(r() * 98)}%;top:${f1(r() * 98)}%;animation-delay:-${(r() * L).toFixed(2)}s"></i>`).join("");
  const css = BASE(p) + `
.rg{position:absolute;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%)}
.r1{width:${u(96)};height:${u(96)};background:repeating-conic-gradient(#fcd34d 0 3deg,transparent 3deg 12deg);-webkit-mask:radial-gradient(circle,transparent 64%,#000 65%,#000 69%,transparent 70%);mask:radial-gradient(circle,transparent 64%,#000 65%,#000 69%,transparent 70%);animation:rr ${L}s linear infinite}
.r2{width:${u(72)};height:${u(72)};background:repeating-conic-gradient(#fcd34daa 0 2deg,transparent 2deg 9deg);-webkit-mask:radial-gradient(circle,transparent 66%,#000 67%,#000 71%,transparent 72%);mask:radial-gradient(circle,transparent 66%,#000 67%,#000 71%,transparent 72%);animation:rr2 ${L}s linear infinite}
@keyframes rr{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(12deg)}}
@keyframes rr2{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(-9deg)}}
.dm{position:absolute;left:50%;top:50%;width:${u(70)};height:${u(70)};transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#4a0808dd 40%,transparent 72%)}
.cw{position:absolute;top:0;animation:cfl ${L}s linear infinite}
@keyframes cfl{0%{transform:translate(0,${u(-8)})}100%{transform:translate(calc(var(--u)*var(--dx)),${u(108)})}}
.cn{display:block;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f5c542 55%,#b8860b);box-shadow:0 0 ${u(1.6)} #f5c54288;position:relative;animation:flip ${L / 2}s linear infinite}
.cn::after{content:"";position:absolute;left:34%;top:34%;width:32%;height:32%;background:#7a1010}
@keyframes flip{from{transform:rotateY(0)}to{transform:rotateY(360deg)}}
.gd{position:absolute;width:${u(1.2)};height:${u(1.2)};background:#ffe08a;transform:rotate(45deg);box-shadow:0 0 ${u(1.6)} #f5c542;animation:tw ${L / 2}s ease-in-out infinite}`;
  return doc(css, `<div class="rg r1"></div><div class="rg r2"></div><div class="dm"></div>${sp}${coins}${textBlock(name, p, 50, greeting)}`, w);
}

/* ---------- 13. Autumn Thanksgiving ---------- */
function thanksgiving(name: string, w: W, greeting: string): string {
  const p = pal("#c2570c", "#3b1503", "#fff1d6", "#ffe0a3", "#ff8a00");
  const cols = ["#f59e0b", "#dc2626", "#ea580c", "#facc15", "#b45309", "#c2410c"];
  const r = rng(73);
  const leaves = Array.from({ length: 18 }, (_, i) => `<div class="lw" style="left:${f1(r() * 96)}%;animation-delay:-${(r() * L).toFixed(2)}s;--dx:${f1(5 + r() * 6)}"><i class="lf" style="width:${u(4 + r() * 3.5)};height:${u(4 + r() * 3.5)};background:linear-gradient(135deg,${cols[i % 6]},color-mix(in srgb,${cols[i % 6]},#000 30%))"></i></div>`).join("");
  const css = BASE(p) + `
.sun{position:absolute;left:50%;top:-18%;width:${u(70)};height:${u(70)};margin-left:${u(-35)};border-radius:50%;background:radial-gradient(circle,#ffd16688,transparent 68%);animation:tw ${L}s ease-in-out infinite}
.lw{position:absolute;top:0;animation:lfl ${L}s linear infinite}
@keyframes lfl{0%{transform:translate(0,${u(-12)}) rotate(0)}33%{transform:translate(calc(var(--u)*var(--dx)),${u(26)}) rotate(120deg)}66%{transform:translate(calc(var(--u)*var(--dx)*-1),${u(60)}) rotate(240deg)}100%{transform:translate(0,${u(112)}) rotate(360deg)}}
.lf{display:block;border-radius:0 100% 0 100%;position:relative;box-shadow:0 ${u(.4)} ${u(1)} #0004}
.lf::after{content:"";position:absolute;left:8%;top:48%;width:84%;height:${u(.3)};background:#fff5;transform:rotate(-45deg);transform-origin:0 50%}
.gr{position:absolute;left:-5%;right:-5%;bottom:${u(-10)};height:${u(20)};border-radius:50%;background:radial-gradient(circle at 20% 40%,#dc2626 0 ${u(1.4)},transparent ${u(1.5)}),radial-gradient(circle at 60% 30%,#facc15 0 ${u(1.4)},transparent ${u(1.5)}),radial-gradient(circle at 85% 50%,#ea580c 0 ${u(1.4)},transparent ${u(1.5)}),#5a2a0a}`;
  return doc(css, `<div class="sun"></div><div class="gr"></div>${leaves}${textBlock(name, p, 50, greeting)}`, w);
}

/* ---------- 14. Easter eggs ---------- */
function easter(name: string, w: W, greeting: string): string {
  const p = pal("#fbcfe8", "#a78bfa", "#6d28d9", "#5b21b6", "#ffffff");
  p.shadow = "0 0 calc(var(--u)*1.5) #ffffffcc";
  const eggs: [number, number, string, string][] = [[16, 15, "#ff8fab", "#ffffff"], [38, 17, "#ffd166", "#ff6b9d"], [62, 17, "#7bdff2", "#ffffff"], [84, 15, "#b2f7a5", "#f78fb3"]];
  const e = eggs.map(([x, s, c, st], i) => `<div class="eg" style="left:${x}%;width:${u(s)};height:${u(s * 1.28)};--c:${c};--s:${st};animation-delay:${dly(i, 4)}"></div>`).join("");
  const r = rng(90);
  const pet = Array.from({ length: 14 }, () => `<i class="pt" style="left:${f1(r() * 98)}%;top:${f1(r() * 60)}%;width:${u(1.2 + r() * 1.4)};height:${u(1.2 + r() * 1.4)};background:${["#fff", "#ffe066", "#ff8fab"][Math.floor(r() * 3)]};animation-delay:-${(r() * L).toFixed(2)}s"></i>`).join("");
  const css = BASE(p) + `
.sn{position:absolute;left:-6%;top:-8%;width:${u(26)};height:${u(26)};border-radius:50%;background:radial-gradient(circle,#fff6b0,#ffe066 60%,#ffd23f);box-shadow:0 0 ${u(8)} #fff3a0;animation:tw ${L}s ease-in-out infinite}
.pt{position:absolute;border-radius:50%;animation:tw ${L / 2}s ease-in-out infinite}
.gr{position:absolute;left:-8%;right:-8%;bottom:${u(-12)};height:${u(26)};border-radius:50%;background:#58d68d;box-shadow:inset 0 ${u(1.6)} 0 #8ff0b3}
.gr2{position:absolute;left:30%;right:-30%;bottom:${u(-15)};height:${u(26)};border-radius:50%;background:#36b36b}
.eg{position:absolute;bottom:${u(4)};transform:translateX(-50%);transform-origin:50% 100%;border-radius:50% 50% 50% 50%/62% 62% 38% 38%;background:repeating-linear-gradient(0deg,transparent 0 ${u(3)},#ffffffaa ${u(3)} ${u(4.4)}),radial-gradient(circle at 35% 28%,#fff9,transparent 30%),radial-gradient(circle at 30% 70%,var(--s) 0 ${u(1)},transparent ${u(1.1)}),var(--c);box-shadow:inset ${u(-1.2)} ${u(-1.6)} ${u(2)} #0002;animation:bnc ${L / 2}s ease-in-out infinite}
@keyframes bnc{0%,100%{transform:translateX(-50%) translateY(0) scale(1.08,.92)}40%{transform:translateX(-50%) translateY(${u(-12)}) scale(.95,1.06)}70%{transform:translateX(-50%) translateY(0) scale(1,1)}}`;
  return doc(css, `<div class="sn"></div>${pet}<div class="gr2"></div><div class="gr"></div>${e}${textBlock(name, p, 34, greeting)}`, w);
}

/* ---------- 15. Jumma aurora ---------- */
function jumma(name: string, w: W, greeting: string): string {
  const p = pal("#06475a", "#020f1a", "#d9fff3", "#9cf5d6", "#22d3ee");
  const r = rng(99);
  const flies = Array.from({ length: 24 }, () => `<i class="ff" style="left:${f1(r() * 96)}%;top:${f1(8 + r() * 86)}%;--x:${f1(r() * 10 - 5)};--y:${f1(r() * 10 - 5)};animation-delay:-${(r() * L).toFixed(2)}s"></i>`).join("");
  const bands = [["#34d399", "#22d3ee", 8, 0], ["#22d3ee", "#a78bfa", 22, 1], ["#a78bfa", "#34d399", 36, 2]].map(([a, b, t, i]) => `<div class="au" style="top:${t}%;background:linear-gradient(90deg,transparent,${a}aa,${b}aa,transparent);animation-delay:${dly(Number(i), 3)}"></div>`).join("");
  const css = BASE(p) + STARS_CSS + `
.au{position:absolute;left:-20%;width:140%;height:${u(18)};filter:blur(${u(3)});transform:skewY(-12deg);animation:aur ${L}s ease-in-out infinite}
@keyframes aur{0%,100%{transform:translateX(${u(-8)}) skewY(-12deg) scaleY(.8)}50%{transform:translateX(${u(8)}) skewY(-12deg) scaleY(1.25)}}
.ff{position:absolute;width:${u(1.3)};height:${u(1.3)};border-radius:50%;background:#e8ffa8;box-shadow:0 0 ${u(2.2)} #c6ff4d;animation:ffl ${L}s ease-in-out infinite}
@keyframes ffl{0%,100%{transform:translate(0,0);opacity:.15}25%{transform:translate(calc(var(--u)*var(--x)),calc(var(--u)*var(--y)));opacity:1}50%{transform:translate(calc(var(--u)*var(--x)*-1),calc(var(--u)*var(--y)*.4));opacity:.3}75%{transform:translate(calc(var(--u)*var(--x)*.5),calc(var(--u)*var(--y)*-1));opacity:1}}
.mw{position:absolute;right:10%;top:6%;width:${u(16)};height:${u(16)};transform:rotate(-20deg)}
.mn{width:100%;height:100%;border-radius:50%;box-shadow:inset ${u(-3.6)} 0 0 0 #fff4c2;filter:drop-shadow(0 0 ${u(2.5)} #fff4c2aa);animation:sway ${L}s ease-in-out infinite}
.hl{position:absolute;left:-10%;right:-10%;bottom:${u(-14)};height:${u(26)};border-radius:50%;background:#04202c;box-shadow:0 ${u(-2)} ${u(6)} #22d3ee44}
.hl2{position:absolute;left:35%;right:-30%;bottom:${u(-17)};height:${u(26)};border-radius:50%;background:#062c3b}`;
  return doc(css, `${stars(97, 24, 55, "#fff", "#9cf5d6")}${bands}<div class="mw"><div class="mn"></div></div><div class="hl2"></div><div class="hl"></div>${flies}${textBlock(name, p, 52, greeting)}`, w);
}

export const FESTIVAL_BUILDERS: Record<string, Builder> = {
  "eid-moon": eidMoon,
  "eid-lanterns": eidLanterns,
  "ramadan-nights": ramadan,
  "eid-adha-star": adha,
  "independence-day": independence,
  "diwali-diyas": diwali,
  "new-year-fireworks": newYear,
  "christmas-snow": christmas,
  "holi-colours": holi,
  "basant-kites": basant,
  "halloween-night": halloween,
  "lunar-new-year": lunar,
  "autumn-thanks": thanksgiving,
  "easter-eggs": easter,
  "jumma-aurora": jumma,
};
