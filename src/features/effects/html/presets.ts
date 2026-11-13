import { esc, rng } from "../render/util";

/**
 * Hand-written HTML/CSS designs. They are (1) free templates, (2) the offline stand-in for the AI
 * in mock mode, and (3) the style example shown to the real AI model. Every size uses --u
 * (1% of the shorter side of the photo) and every animation uses 4s / 2s / 1s durations so the GIF loops.
 */
const TITLE_CSS = `
.t{position:absolute;left:4%;right:4%;font:800 calc(var(--u)*9)/1.1 "DejaVu Sans",sans-serif;text-align:center;
color:#fff3c4;text-shadow:0 calc(var(--u)*.6) calc(var(--u)*1.5) rgba(60,10,0,.9),0 0 calc(var(--u)*4) #ff9d2e;animation:pu 4s ease-in-out infinite}
@keyframes pu{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}`;

const fit = (title: string) => {
  const t = title.trim().slice(0, 28) || "Celebrate!";
  const size = Math.max(4.5, Math.min(9, 78 / Math.max(6, t.length * 0.62)));
  return { text: esc(t), size };
};

export function festivalDesign(title: string): string {
  const r = rng(11);
  const { text, size } = fit(title);
  const stars = Array.from({ length: 22 }, (_, i) =>
    `<i class="s" style="left:${(r() * 96).toFixed(0)}%;top:${(r() * 55).toFixed(0)}%;animation-delay:-${(r() * 2).toFixed(2)}s"></i>`).join("");
  const lanterns = [8, 27, 50, 73, 90].map((x, i) =>
    `<div class="l" style="left:${x}%;animation-delay:-${i * 0.8}s"><i></i><b style="animation-delay:-${i * 0.4}s"></b></div>`).join("");
  return `<style>
.g{position:absolute;inset:0;background:radial-gradient(circle at 50% 105%,rgba(255,150,30,.45),transparent 62%)}
.s{position:absolute;width:calc(var(--u)*1.5);height:calc(var(--u)*1.5);border-radius:50%;background:#fff7c2;box-shadow:0 0 calc(var(--u)*2) #ffe58a;animation:tw 2s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.15;transform:scale(.6)}50%{opacity:1;transform:scale(1.3)}}
.l{position:absolute;top:calc(var(--u)*-8);width:calc(var(--u)*10);margin-left:calc(var(--u)*-5);transform-origin:50% 0;animation:sw 4s ease-in-out infinite}
.l i{display:block;margin:0 auto;width:2px;height:calc(var(--u)*14);background:#ffd36b}
.l b{display:block;height:calc(var(--u)*12);border-radius:40% 40% 46% 46%;background:linear-gradient(#ffc04a,#ff6a00);box-shadow:0 0 calc(var(--u)*6) #ffae42,inset 0 0 calc(var(--u)*3) #fff3b0;animation:gl 2s ease-in-out infinite}
@keyframes sw{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes gl{0%,100%{filter:brightness(.9)}50%{filter:brightness(1.35)}}
${TITLE_CSS}
.t{bottom:calc(var(--u)*6);font-size:calc(var(--u)*${size.toFixed(1)})}
</style><div class="g"></div>${stars}${lanterns}<div class="t">${text}</div>`;
}

export function feastDesign(title: string): string {
  const { text, size } = fit(title);
  const food = ["🍗", "🥘", "🍛", "🍢", "🥗", "🍰"].map((f, i) =>
    `<span class="f" style="left:${6 + i * 15.5}%;animation-delay:-${(i * 0.33).toFixed(2)}s">${f}</span>`).join("");
  const steam = Array.from({ length: 7 }, (_, i) =>
    `<u class="w" style="left:${8 + i * 13}%;animation-delay:-${(i * 0.57).toFixed(2)}s"></u>`).join("");
  return `<style>
.b{position:absolute;left:0;right:0;bottom:0;height:34%;background:linear-gradient(transparent,rgba(40,10,0,.75))}
.f{position:absolute;bottom:calc(var(--u)*5);font-size:calc(var(--u)*11);animation:bob 1s ease-in-out infinite;filter:drop-shadow(0 calc(var(--u)*.8) calc(var(--u)*1) rgba(0,0,0,.5))}
@keyframes bob{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(calc(var(--u)*-3)) scale(1.1)}}
.w{position:absolute;bottom:calc(var(--u)*17);width:calc(var(--u)*5);height:calc(var(--u)*9);border-radius:50%;background:rgba(255,255,255,.55);filter:blur(calc(var(--u)*1.4));animation:st 2s ease-in infinite}
@keyframes st{0%{transform:translateY(0) scale(.6);opacity:0}30%{opacity:.7}100%{transform:translateY(calc(var(--u)*-22)) scale(1.5);opacity:0}}
${TITLE_CSS}
.t{top:calc(var(--u)*4);font-size:calc(var(--u)*${size.toFixed(1)})}
</style><div class="b"></div>${steam}${food}<div class="t">${text}</div>`;
}

export function partyDesign(title: string): string {
  const r = rng(3);
  const { text, size } = fit(title);
  const colors = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"];
  const balloons = Array.from({ length: 6 }, (_, i) =>
    `<div class="bl" style="left:${6 + i * 16}%;background:${colors[i % 5]};animation-delay:-${(i * 0.66).toFixed(2)}s"></div>`).join("");
  const conf = Array.from({ length: 34 }, (_, i) =>
    `<i class="c" style="left:${(r() * 98).toFixed(0)}%;background:${colors[i % 5]};animation-duration:${i % 2 ? 4 : 2}s;animation-delay:-${(r() * 4).toFixed(2)}s"></i>`).join("");
  return `<style>
.bl{position:absolute;bottom:calc(var(--u)*-16);width:calc(var(--u)*11);height:calc(var(--u)*14);border-radius:50% 50% 48% 48%;animation:up 4s linear infinite;box-shadow:inset calc(var(--u)*-1.2) calc(var(--u)*-1.2) calc(var(--u)*2) rgba(0,0,0,.18)}
.bl::after{content:"";position:absolute;left:50%;top:100%;width:2px;height:calc(var(--u)*9);background:rgba(255,255,255,.8)}
@keyframes up{0%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(calc(var(--u)*-70)) rotate(4deg)}100%{transform:translateY(calc(var(--u)*-140)) rotate(-4deg)}}
.c{position:absolute;top:calc(var(--u)*-4);width:calc(var(--u)*1.6);height:calc(var(--u)*3);animation-name:fall;animation-timing-function:linear}
@keyframes fall{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(calc(var(--u)*112)) rotate(540deg)}}
.v{position:absolute;inset:0;background:linear-gradient(rgba(40,0,60,.45),transparent 35%)}
${TITLE_CSS}
.t{top:calc(var(--u)*5);font-size:calc(var(--u)*${size.toFixed(1)})}
</style><div class="v"></div>${balloons}${conf}<div class="t">${text}</div>`;
}

export type PresetId = "festival" | "feast" | "party";
export const PRESETS: { id: PresetId; label: string; prompt: string; build: (title: string) => string }[] = [
  { id: "festival", label: "Eid / Diwali lights", prompt: "Eid Mubarak with glowing lanterns and twinkling stars", build: festivalDesign },
  { id: "feast", label: "Feast & dawat", prompt: "Dawat time! a feast with steaming food", build: feastDesign },
  { id: "party", label: "Party pop", prompt: "Party time with balloons and confetti", build: partyDesign },
];

/** Picks a preset from keywords. Used by the mock AI so the whole pipeline is testable offline. */
export function presetForPrompt(prompt: string): (typeof PRESETS)[number] {
  const p = prompt.toLowerCase();
  if (/(feast|food|dawat|dinner|eat|iftar|biryani|bbq|lunch|cake)/.test(p)) return PRESETS[1];
  if (/(party|birthday|balloon|confetti|celebrat|congrat|graduat|wedding)/.test(p)) return PRESETS[2];
  return PRESETS[0];
}
