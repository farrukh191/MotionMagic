
import { rng } from "./text";
import { BASE, L, doc, textBlock, u, type Palette } from "./scene";

type W = number | "fluid";
type Builder = (name: string, w: W, greeting: string) => string;

const pal = (
    bg1: string,
    bg2: string,
    head: string,
    name: string,
    glow: string
): Palette => ({
    bg1,
    bg2,
    head,
    nameCss: `color:${name};text-shadow:0 0 calc(var(--u)*2) ${glow},0 calc(var(--u)*.5) calc(var(--u)*1) rgba(0,0,0,.45)`,
    shadow: "0 calc(var(--u)*.4) calc(var(--u)*1) rgba(0,0,0,.5)",
});

const f1 = (n: number) => n.toFixed(1);
const dly = (i: number, n: number) => `-${((i * L) / n).toFixed(2)}s`;

const STAR =
    "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)";

function makeStars(seed: number, count: number): string {
    const r = rng(seed);

    return Array.from({ length: count }, () => `
        <i class="cg-star" style="
            left:${f1(r() * 98)}%;
            top:${f1(r() * 90)}%;
            animation-delay:-${(r() * L).toFixed(2)}s;
        "></i>
    `).join("");
}

const CONFETTI_COLORS = [
    "#ffd166",
    "#ff4d6d",
    "#4cc9f0",
    "#7bd88f",
    "#b980f0",
    "#ffffff",
];

function makeConfetti(seed: number, count: number): string {
    const r = rng(seed);

    return Array.from({ length: count }, (_, i) => `
        <i class="cg-confetti" style="
            left:${f1(r() * 100)}%;
            background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};
            width:${u(1 + r() * 1.5)};
            height:${u(2 + r() * 2)};
            animation-delay:-${(r() * L).toFixed(2)}s;
            animation-duration:${(L * (0.85 + r() * 0.3)).toFixed(2)}s;
            --drift:${f1(r() * 12 - 6)};
        "></i>
    `).join("");
}

const COMMON_CSS = `
.cg-star {
    position:absolute;
    width:${u(2)};
    height:${u(2)};
    background:#fff1a8;
    clip-path:${STAR};
    filter:drop-shadow(0 0 ${u(2)} #ffd166);
    animation:cg-twinkle ${L / 2}s ease-in-out infinite;
}

.cg-confetti {
    position:absolute;
    top:-8%;
    border-radius:${u(.4)};
    opacity:0;
    animation:cg-fall ${L}s linear infinite;
}

@keyframes cg-twinkle {
    0%,100% { opacity:.25; transform:scale(.65) rotate(0); }
    50% { opacity:1; transform:scale(1.3) rotate(35deg); }
}

@keyframes cg-fall {
    0% {
        transform:translate(0,${u(-8)}) rotate(0);
        opacity:0;
    }
    10% { opacity:1; }
    90% { opacity:.9; }
    100% {
        transform:translate(calc(var(--u)*var(--drift)),${u(110)}) rotate(540deg);
        opacity:0;
    }
}

@keyframes cg-float {
    0%,100% { transform:translateY(0); }
    50% { transform:translateY(${u(-4)}); }
}

@keyframes cg-glow {
    0%,100% { filter:brightness(.9); }
    50% { filter:brightness(1.35); }
}
`;

/* --------------------------------------------------
   1. GOLDEN TROPHY
   A 3D-style golden trophy with animated handles,
   glowing stars, confetti and a podium.
-------------------------------------------------- */

function goldenTrophy(name: string, w: W, greeting: string): string {
    const p = pal(
        "#29104d",
        "#09051d",
        "#fff1b8",
        "#ffd45e",
        "#ffb703"
    );

    const css = BASE(p) + COMMON_CSS + `
.cg-trophy-wrap {
    position:absolute;
    left:50%;
    top:43%;
    width:${u(39)};
    height:${u(46)};
    transform:translate(-50%,-50%);
    animation:cg-trophy-float ${L / 2}s ease-in-out infinite;
}

.cg-cup {
    position:absolute;
    left:22%;
    top:0;
    width:56%;
    height:49%;
    border-radius:15% 15% 45% 45%;
    background:linear-gradient(
        90deg,
        #9c5b00,
        #ffd700 22%,
        #fff1a8 42%,
        #e6a400 70%,
        #8c4c00
    );
    box-shadow:0 0 ${u(6)} #ffc400aa,inset 0 0 ${u(2)} #fff;
}

.cg-cup:before,.cg-cup:after {
    content:"";
    position:absolute;
    top:12%;
    width:35%;
    height:58%;
    border:${u(2)} solid #ffd45e;
    border-radius:50%;
}

.cg-cup:before { left:-30%; }
.cg-cup:after { right:-30%; }

.cg-cup-center {
    position:absolute;
    left:37%;
    top:15%;
    width:26%;
    height:25%;
    background:#fff2ae;
    clip-path:${STAR};
    filter:drop-shadow(0 0 ${u(2)} #fff);
}

.cg-stem {
    position:absolute;
    left:44%;
    top:48%;
    width:12%;
    height:23%;
    background:linear-gradient(90deg,#9c5b00,#fff1a8,#c27b00);
}

.cg-base {
    position:absolute;
    left:27%;
    top:68%;
    width:46%;
    height:13%;
    border-radius:${u(1)};
    background:linear-gradient(#ffe18a,#9c5b00);
}

.cg-podium {
    position:absolute;
    left:12%;
    top:82%;
    width:76%;
    height:12%;
    border-radius:${u(2)};
    background:linear-gradient(90deg,#5c2c00,#e6a400,#fff0a8,#9c5b00);
    box-shadow:0 ${u(2)} ${u(6)} #ffb70388;
}

@keyframes cg-trophy-float {
    0%,100% { transform:translate(-50%,-50%) rotate(-3deg); }
    50% { transform:translate(-50%,-56%) rotate(3deg); }
}

.cg-trophy-light {
    position:absolute;
    left:50%;
    top:45%;
    width:${u(65)};
    height:${u(65)};
    transform:translate(-50%,-50%);
    border-radius:50%;
    background:radial-gradient(circle,#ffd16655,transparent 68%);
    animation:cg-glow ${L / 2}s ease-in-out infinite;
}
`;

    return doc(
        css,
        `
        ${makeStars(101, 22)}
        ${makeConfetti(102, 30)}
        <div class="cg-trophy-light"></div>
        <div class="cg-trophy-wrap">
            <div class="cg-cup">
                <i class="cg-cup-center"></i>
            </div>
            <div class="cg-stem"></div>
            <div class="cg-base"></div>
            <div class="cg-podium"></div>
        </div>
        ${textBlock(name, p, 68, greeting)}
        `,
        w
    );
}

/* --------------------------------------------------
   2. GRADUATION CELEBRATION
   Floating graduation caps, diploma and golden stars.
-------------------------------------------------- */

function graduation(name: string, w: W, greeting: string): string {
    const p = pal(
        "#172554",
        "#080e29",
        "#ffffff",
        "#ffe08a",
        "#60a5fa"
    );

    const caps = [
        [17, 18, -14],
        [78, 15, 13],
        [18, 65, 12],
        [82, 65, -12],
    ];

    const capMarkup = caps.map(([x, y, rot], i) => `
        <div class="cg-cap" style="
            left:${x}%;
            top:${y}%;
            --rot:${rot}deg;
            animation-delay:${dly(i, 4)};
        ">
            <div class="cg-cap-top"></div>
            <div class="cg-cap-bottom"></div>
            <i class="cg-cap-tassel"></i>
        </div>
    `).join("");

    const css = BASE(p) + COMMON_CSS + `
.cg-cap {
    position:absolute;
    width:${u(17)};
    height:${u(13)};
    transform:translate(-50%,-50%);
    animation:cg-cap-float ${L}s ease-in-out infinite;
}

.cg-cap-top {
    position:absolute;
    left:0;
    top:0;
    width:100%;
    height:75%;
    background:linear-gradient(135deg,#fff0a8,#d69a16,#704900);
    clip-path:polygon(50% 0,100% 48%,50% 100%,0 48%);
    filter:drop-shadow(0 0 ${u(2)} #ffd45e);
}

.cg-cap-bottom {
    position:absolute;
    left:24%;
    top:55%;
    width:52%;
    height:40%;
    border-radius:0 0 ${u(2)} ${u(2)};
    background:linear-gradient(90deg,#a66b00,#ffdf75,#9c5b00);
}

.cg-cap-tassel {
    position:absolute;
    right:0;
    top:40%;
    width:${u(.6)};
    height:${u(10)};
    background:#ffe08a;
    transform:rotate(-20deg);
    transform-origin:top;
}

@keyframes cg-cap-float {
    0%,100% { transform:translate(-50%,-50%) rotate(var(--rot)); }
    50% { transform:translate(-50%,-80%) rotate(calc(var(--rot) + 12deg)); }
}

.cg-diploma {
    position:absolute;
    left:50%;
    top:43%;
    width:${u(30)};
    height:${u(17)};
    transform:translate(-50%,-50%) rotate(-8deg);
    border:${u(1)} solid #fcd978;
    border-radius:${u(1)};
    background:linear-gradient(135deg,#fff8d8,#e6bd69);
    box-shadow:0 0 ${u(6)} #ffd16677;
    animation:cg-diploma-float ${L / 2}s ease-in-out infinite;
}

.cg-diploma:before {
    content:"";
    position:absolute;
    left:10%;
    right:10%;
    top:25%;
    height:${u(.7)};
    background:#ae8129;
    box-shadow:0 ${u(3)} 0 #ae8129;
}

.cg-diploma:after {
    content:"";
    position:absolute;
    left:43%;
    bottom:${u(-5)};
    width:${u(8)};
    height:${u(8)};
    border-radius:50%;
    background:#e8a91c;
    box-shadow:0 0 ${u(3)} #ffd166;
}

@keyframes cg-diploma-float {
    0%,100% { transform:translate(-50%,-50%) rotate(-8deg); }
    50% { transform:translate(-50%,-58%) rotate(8deg); }
}
`;

    return doc(
        css,
        `
        ${makeStars(110, 25)}
        ${makeConfetti(111, 25)}
        ${capMarkup}
        <div class="cg-diploma"></div>
        ${textBlock(name, p, 70, greeting)}
        `,
        w
    );
}

/* --------------------------------------------------
   3. ACHIEVEMENT UNLOCKED
   Animated medal, rotating rings and success badge.
-------------------------------------------------- */

function achievement(name: string, w: W, greeting: string): string {
    const p = pal(
        "#102c45",
        "#06121f",
        "#e7f7ff",
        "#7df9c2",
        "#34d399"
    );

    const css = BASE(p) + COMMON_CSS + `
.cg-ring {
    position:absolute;
    left:50%;
    top:40%;
    width:${u(65)};
    height:${u(65)};
    border:${u(1)} dashed #5eead4aa;
    border-radius:50%;
    transform:translate(-50%,-50%);
    animation:cg-ring ${L}s linear infinite;
}

.cg-ring:before,.cg-ring:after {
    content:"";
    position:absolute;
    inset:${u(5)};
    border:${u(.7)} solid #7df9c255;
    border-radius:50%;
}

.cg-ring:after {
    inset:${u(12)};
    border-style:dotted;
}

@keyframes cg-ring {
    from { transform:translate(-50%,-50%) rotate(0); }
    to { transform:translate(-50%,-50%) rotate(360deg); }
}

.cg-medal {
    position:absolute;
    left:50%;
    top:39%;
    width:${u(31)};
    height:${u(31)};
    transform:translate(-50%,-50%);
    border-radius:50%;
    background:radial-gradient(circle at 35% 30%,#d1fae5,#34d399 48%,#047857 85%);
    border:${u(1.5)} solid #a7f3d0;
    box-shadow:0 0 ${u(8)} #34d39999,inset 0 0 ${u(3)} #fff;
    animation:cg-medal ${L / 2}s ease-in-out infinite;
}

.cg-medal:before {
    content:"";
    position:absolute;
    inset:20%;
    border:${u(1)} solid #eafff5;
    border-radius:50%;
}

.cg-medal:after {
    content:"";
    position:absolute;
    left:36%;
    top:29%;
    width:28%;
    height:38%;
    background:#fff;
    clip-path:polygon(50% 0,61% 35%,100% 35%,68% 57%,79% 100%,50% 74%,21% 100%,32% 57%,0 35%,39% 35%);
}

@keyframes cg-medal {
    0%,100% { transform:translate(-50%,-50%) scale(1) rotate(-5deg); }
    50% { transform:translate(-50%,-55%) scale(1.12) rotate(5deg); }
}

.cg-ribbon {
    position:absolute;
    left:50%;
    top:52%;
    width:${u(21)};
    height:${u(17)};
    transform:translateX(-50%);
    background:linear-gradient(90deg,#047857,#34d399,#047857);
    clip-path:polygon(0 0,100% 0,83% 100%,50% 72%,17% 100%);
}

.cg-check {
    position:absolute;
    left:50%;
    top:40%;
    width:${u(9)};
    height:${u(5)};
    border-left:${u(1.3)} solid #fff;
    border-bottom:${u(1.3)} solid #fff;
    transform:translate(-50%,-50%) rotate(-45deg);
    opacity:0;
    animation:cg-check ${L}s ease-in-out infinite;
}

@keyframes cg-check {
    0%,20% { opacity:0; transform:translate(-50%,-50%) rotate(-45deg) scale(.5); }
    35%,80% { opacity:1; transform:translate(-50%,-50%) rotate(-45deg) scale(1); }
    100% { opacity:0; }
}
`;

    return doc(
        css,
        `
        ${makeStars(120, 28)}
        ${makeConfetti(121, 22)}
        <div class="cg-ring"></div>
        <div class="cg-ribbon"></div>
        <div class="cg-medal"></div>
        <i class="cg-check"></i>
        ${textBlock(name, p, 68, greeting)}
        `,
        w
    );
}

/* --------------------------------------------------
   4. GRAND CELEBRATION
   Balloons rising, strings swaying and colorful confetti.
-------------------------------------------------- */

function grandCelebration(name: string, w: W, greeting: string): string {
    const p = pal(
        "#43115f",
        "#130629",
        "#fff4ff",
        "#ffd166",
        "#ff4d9d"
    );

    const balloonData: [number, number, string][] = [
        [9, 25, "#ff4d6d"],
        [24, 14, "#ffd166"],
        [40, 27, "#4cc9f0"],
        [60, 16, "#b980f0"],
        [77, 25, "#7bd88f"],
        [92, 13, "#ff9f1c"],
    ];

    const balloons = balloonData.map(([x, y, c], i) => `
        <div class="cg-balloon" style="
            left:${x}%;
            top:${y}%;
            --balloon:${c};
            animation-delay:${dly(i, 6)};
        ">
            <i class="cg-balloon-body"></i>
            <i class="cg-balloon-string"></i>
        </div>
    `).join("");

    const css = BASE(p) + COMMON_CSS + `
.cg-balloon {
    position:absolute;
    width:${u(13)};
    height:${u(29)};
    transform:translateX(-50%);
    animation:cg-balloon-rise ${L}s ease-in-out infinite;
}

.cg-balloon-body {
    position:absolute;
    top:0;
    left:0;
    width:100%;
    height:70%;
    border-radius:50% 50% 45% 45%;
    background:radial-gradient(
        circle at 30% 25%,
        #ffffff,
        var(--balloon) 35%,
        color-mix(in srgb,var(--balloon),#000 35%)
    );
    box-shadow:0 0 ${u(4)} var(--balloon);
}

.cg-balloon-body:after {
    content:"";
    position:absolute;
    left:45%;
    bottom:${u(-1)};
    width:12%;
    height:${u(2)};
    background:var(--balloon);
    clip-path:polygon(0 0,100% 0,50% 100%);
}

.cg-balloon-string {
    position:absolute;
    left:50%;
    top:70%;
    height:${u(13)};
    width:${u(.35)};
    background:#ffffff99;
    transform-origin:top;
    animation:cg-string ${L / 2}s ease-in-out infinite;
}

@keyframes cg-balloon-rise {
    0%,100% { transform:translate(-50%,0) rotate(-5deg); }
    50% { transform:translate(-50%,-${u(5)}) rotate(5deg); }
}

@keyframes cg-string {
    0%,100% { transform:rotate(-8deg); }
    50% { transform:rotate(8deg); }
}

.cg-party-glow {
    position:absolute;
    left:50%;
    top:40%;
    width:${u(85)};
    height:${u(55)};
    transform:translate(-50%,-50%);
    border-radius:50%;
    background:radial-gradient(ellipse,#e879f955,transparent 70%);
    animation:cg-glow ${L / 2}s ease-in-out infinite;
}
`;

    return doc(
        css,
        `
        ${makeConfetti(130, 38)}
        ${balloons}
        <div class="cg-party-glow"></div>
        ${makeStars(131, 16)}
        ${textBlock(name, p, 64, greeting)}
        `,
        w
    );
}

/* --------------------------------------------------
   5. ROCKET SUCCESS
   A rocket rises through the sky with an animated
   flame trail, stars and a glowing launch.
-------------------------------------------------- */

function rocketSuccess(name: string, w: W, greeting: string): string {
    const p = pal(
        "#092c63",
        "#02091f",
        "#ffffff",
        "#9de7ff",
        "#38bdf8"
    );

    const css = BASE(p) + COMMON_CSS + `
.cg-rocket-wrap {
    position:absolute;
    left:50%;
    top:43%;
    width:${u(18)};
    height:${u(39)};
    transform:translate(-50%,-50%);
    animation:cg-launch ${L}s ease-in-out infinite;
}

.cg-rocket {
    position:absolute;
    inset:0 10% 20%;
    border-radius:50% 50% 20% 20%;
    background:linear-gradient(90deg,#a5d8ff,#fff,#60a5fa);
    box-shadow:0 0 ${u(5)} #38bdf8aa;
}

.cg-rocket:before {
    content:"";
    position:absolute;
    left:0;
    top:-18%;
    width:100%;
    height:30%;
    background:#ff647c;
    clip-path:polygon(50% 0,100% 100%,0 100%);
}

.cg-window {
    position:absolute;
    left:29%;
    top:28%;
    width:42%;
    height:25%;
    border-radius:50%;
    background:radial-gradient(circle at 35% 30%,#fff,#38bdf8 65%,#075985);
    border:${u(1)} solid #075985;
}

.cg-wing {
    position:absolute;
    bottom:18%;
    width:38%;
    height:35%;
    background:#fb7185;
}

.cg-wing.left {
    left:-22%;
    clip-path:polygon(100% 0,100% 100%,0 100%);
}

.cg-wing.right {
    right:-22%;
    clip-path:polygon(0 0,100% 100%,0 100%);
}

.cg-flame {
    position:absolute;
    left:28%;
    bottom:-18%;
    width:44%;
    height:24%;
    border-radius:50% 50% 65% 65%;
    background:linear-gradient(#fff6a5,#ff9f1c,#ff4d6d);
    filter:drop-shadow(0 0 ${u(3)} #ff9f1c);
    transform-origin:50% 0;
    animation:cg-flame ${L / 4}s ease-in-out infinite alternate;
}

@keyframes cg-flame {
    from { transform:scaleX(.8) scaleY(.9); }
    to { transform:scaleX(1.2) scaleY(1.3); }
}

@keyframes cg-launch {
    0%,100% { transform:translate(-50%,-50%) rotate(-5deg); }
    50% { transform:translate(-50%,-${u(8)}) rotate(5deg); }
}

.cg-orbit {
    position:absolute;
    left:50%;
    top:43%;
    width:${u(63)};
    height:${u(24)};
    border:${u(.8)} solid #7dd3fc66;
    border-radius:50%;
    transform:translate(-50%,-50%) rotate(-25deg);
    animation:cg-orbit ${L}s linear infinite;
}

@keyframes cg-orbit {
    from { transform:translate(-50%,-50%) rotate(-25deg); }
    to { transform:translate(-50%,-50%) rotate(335deg); }
}

.cg-trail {
    position:absolute;
    left:50%;
    top:58%;
    width:${u(2)};
    height:${u(22)};
    transform:translateX(-50%);
    background:linear-gradient(#38bdf8,transparent);
    filter:blur(${u(1)});
    animation:cg-trail ${L / 2}s ease-in-out infinite;
}

@keyframes cg-trail {
    0%,100% { opacity:.25; transform:translateX(-50%) scaleY(.6); }
    50% { opacity:1; transform:translateX(-50%) scaleY(1.3); }
}
`;

    return doc(
        css,
        `
        ${makeStars(140, 34)}
        ${makeConfetti(141, 20)}
        <div class="cg-orbit"></div>
        <div class="cg-trail"></div>
        <div class="cg-rocket-wrap">
            <div class="cg-rocket">
                <i class="cg-window"></i>
                <i class="cg-wing left"></i>
                <i class="cg-wing right"></i>
                <i class="cg-flame"></i>
            </div>
        </div>
        ${textBlock(name, p, 69, greeting)}
        `,
        w
    );
}


/* ---------- 6. Crown Reveal ---------- */
function crownReveal(name: string, w: W, greeting: string): string {
    const p = pal("#30105c", "#09051f", "#fff2c6", "#ffdc70", "#ffb703");

    const css = BASE(p) + `
.cr-stage {
    position:absolute;
    left:50%;
    top:42%;
    width:${u(42)};
    height:${u(38)};
    transform:translate(-50%,-50%);
}
.cr-crown {
    position:absolute;
    left:50%;
    top:20%;
    width:100%;
    height:65%;
    transform:translateX(-50%);
    background:linear-gradient(135deg,#fff1a8,#e5a800 45%,#9b5b00);
    clip-path:polygon(0 15%,25% 48%,38% 0,52% 45%,76% 0,85% 48%,100% 15%,88% 100%,12% 100%);
    filter:drop-shadow(0 0 ${u(5)} #ffcf40);
    animation:crownIn ${L}s ease-in-out infinite;
}
.cr-base {
    position:absolute;
    left:12%;
    bottom:0;
    width:76%;
    height:15%;
    border-radius:${u(2)};
    background:linear-gradient(#fff1a8,#b87900);
}
.cr-gem {
    position:absolute;
    left:47%;
    top:53%;
    width:${u(5)};
    height:${u(5)};
    background:#ff3d9a;
    transform:rotate(45deg);
    box-shadow:0 0 ${u(5)} #ff3d9a;
}
.cr-ray {
    position:absolute;
    left:50%;
    top:40%;
    width:${u(2)};
    height:${u(12)};
    background:linear-gradient(#fff5ad,transparent);
    transform-origin:50% 100%;
    animation:crRay ${L}s linear infinite;
}
.cr-ray.r1 { transform:rotate(0deg) translateY(${u(-27)}); }
.cr-ray.r2 { transform:rotate(45deg) translateY(${u(-27)}); }
.cr-ray.r3 { transform:rotate(90deg) translateY(${u(-27)}); }
.cr-ray.r4 { transform:rotate(135deg) translateY(${u(-27)}); }
@keyframes crownIn {
    0%,100% { transform:translateX(-50%) translateY(${u(3)}) scale(.94); }
    50% { transform:translateX(-50%) translateY(${u(-4)}) scale(1.08); }
}
@keyframes crRay {
    0%,100% { opacity:.15; }
    50% { opacity:.9; }
}`;

    const rays = [0, 1, 2, 3]
        .map(i => `<i class="cr-ray r${i + 1}"></i>`)
        .join("");

    return doc(css, `
        <div class="cr-stage">
            ${rays}
            <div class="cr-crown"></div>
            <div class="cr-base"></div>
            <i class="cr-gem"></i>
        </div>
        ${textBlock(name, p, 64, greeting)}
    `, w);
}

/* ---------- 7. Finish Line Victory ---------- */
function finishLine(name: string, w: W, greeting: string): string {
    const p = pal("#092e50", "#03101f", "#ffffff", "#72e5ff", "#00cfff");

    const css = BASE(p) + `
.fl-track {
    position:absolute;
    left:-10%;
    right:-10%;
    top:38%;
    height:${u(20)};
    transform:skewY(-12deg);
    background:repeating-linear-gradient(
        90deg,
        #ffffff 0 ${u(4)},
        #15263b ${u(4)} ${u(8)}
    );
    opacity:.75;
    animation:flMove ${L}s linear infinite;
}
.fl-line {
    position:absolute;
    left:50%;
    top:18%;
    width:${u(2)};
    height:${u(42)};
    background:linear-gradient(#ffffff,#5ce1ff);
    box-shadow:0 0 ${u(6)} #00d9ff;
}
.fl-flag {
    position:absolute;
    left:50%;
    top:18%;
    width:${u(23)};
    height:${u(13)};
    background:repeating-linear-gradient(
        0deg,
        #ffffff 0 33%,
        #168bce 33% 66%,
        #ffffff 66% 100%
    );
    clip-path:polygon(0 0,100% 10%,85% 100%,0 85%);
    transform-origin:left center;
    animation:flWave ${L / 2}s ease-in-out infinite;
}
.fl-runner {
    position:absolute;
    left:50%;
    top:57%;
    width:${u(10)};
    height:${u(15)};
    transform:translate(-50%,-50%);
}
.fl-head {
    position:absolute;
    top:0;
    left:35%;
    width:${u(4)};
    height:${u(4)};
    border-radius:50%;
    background:#ffe4ad;
}
.fl-body {
    position:absolute;
    left:38%;
    top:25%;
    width:${u(3)};
    height:${u(8)};
    border-radius:50%;
    background:#60d8ff;
    transform:rotate(25deg);
}
.fl-leg {
    position:absolute;
    left:40%;
    top:65%;
    width:${u(2)};
    height:${u(8)};
    background:#ffffff;
    transform-origin:top;
    animation:flLeg .35s ease-in-out infinite alternate;
}
.fl-leg.two {
    animation-delay:-.35s;
}
@keyframes flMove {
    from { background-position:0 0; }
    to { background-position:${u(32)} 0; }
}
@keyframes flWave {
    0%,100% { transform:rotate(-5deg); }
    50% { transform:rotate(8deg); }
}
@keyframes flLeg {
    from { transform:rotate(-35deg); }
    to { transform:rotate(45deg); }
}`;

    return doc(css, `
        <div class="fl-track"></div>
        <div class="fl-line"></div>
        <div class="fl-flag"></div>
        <div class="fl-runner">
            <i class="fl-head"></i>
            <i class="fl-body"></i>
            <i class="fl-leg"></i>
            <i class="fl-leg two"></i>
        </div>
        ${textBlock(name, p, 68, greeting)}
    `, w);
}

/* ---------- 8. Puzzle Solved ---------- */
function puzzleComplete(name: string, w: W, greeting: string): string {
    const p = pal("#164e63", "#061b2a", "#e0ffff", "#67e8f9", "#22d3ee");

    const pieces = [
        [0, 0, "#22d3ee"],
        [1, 0, "#818cf8"],
        [0, 1, "#34d399"],
        [1, 1, "#fbbf24"],
    ];

    const puzzle = pieces.map(([x, y, c]: any, i) =>
        `<i class="pz-piece" style="
            left:${x * 21}%;
            top:${y * 21}%;
            --pc:${c};
            animation-delay:${dly(i, 4)}
        "></i>`
    ).join("");

    const css = BASE(p) + `
.pz-board {
    position:absolute;
    left:50%;
    top:40%;
    width:${u(48)};
    height:${u(48)};
    transform:translate(-50%,-50%) rotate(-5deg);
}
.pz-piece {
    position:absolute;
    width:43%;
    height:43%;
    border-radius:${u(3)};
    background:var(--pc);
    box-shadow:inset 0 0 ${u(3)} #ffffff88,0 0 ${u(3)} var(--pc);
    clip-path:polygon(
        0 0,35% 0,35% 15%,50% 15%,50% 0,
        100% 0,100% 100%,65% 100%,65% 85%,
        50% 85%,50% 100%,0 100%
    );
    animation:pzGlow ${L / 2}s ease-in-out infinite;
}
.pz-check {
    position:absolute;
    left:50%;
    top:48%;
    width:${u(17)};
    height:${u(8)};
    border-left:${u(2.5)} solid #ffffff;
    border-bottom:${u(2.5)} solid #ffffff;
    transform:translate(-50%,-50%) rotate(-45deg);
    filter:drop-shadow(0 0 ${u(3)} #22d3ee);
    animation:pzCheck ${L}s ease-in-out infinite;
}
.pz-ring {
    position:absolute;
    left:50%;
    top:40%;
    width:${u(65)};
    height:${u(65)};
    border:${u(.8)} solid #67e8f977;
    border-radius:50%;
    transform:translate(-50%,-50%);
    animation:pzRing ${L}s ease-in-out infinite;
}
@keyframes pzGlow {
    0%,100% { filter:brightness(.85); }
    50% { filter:brightness(1.4); }
}
@keyframes pzCheck {
    0%,15% { opacity:0; transform:translate(-50%,-50%) rotate(-45deg) scale(.2); }
    35%,100% { opacity:1; transform:translate(-50%,-50%) rotate(-45deg) scale(1); }
}
@keyframes pzRing {
    0%,100% { transform:translate(-50%,-50%) scale(.92); opacity:.35; }
    50% { transform:translate(-50%,-50%) scale(1.08); opacity:1; }
}`;

    return doc(css, `
        <div class="pz-ring"></div>
        <div class="pz-board">${puzzle}</div>
        <div class="pz-check"></div>
        ${textBlock(name, p, 67, greeting)}
    `, w);
}

/* ---------- 9. Curtain Opening ---------- */
function curtainSpotlight(name: string, w: W, greeting: string): string {
    const p = pal("#40102b", "#100511", "#fff1df", "#ffd28a", "#ff9f43");

    const css = BASE(p) + `
.cs-stage {
    position:absolute;
    inset:0;
    overflow:hidden;
}
.cs-curtain {
    position:absolute;
    top:0;
    bottom:0;
    width:52%;
    background:repeating-linear-gradient(
        90deg,
        #650d32 0 ${u(5)},
        #a21d4d ${u(5)} ${u(10)},
        #570b2b ${u(10)} ${u(14)}
    );
    box-shadow:0 0 ${u(8)} #0009;
    animation:csOpen ${L}s ease-in-out infinite;
}
.cs-curtain.left { left:0; transform-origin:left; }
.cs-curtain.right { right:0; transform-origin:right; }
.cs-light {
    position:absolute;
    left:50%;
    top:5%;
    width:80%;
    height:80%;
    transform:translateX(-50%);
    background:radial-gradient(ellipse,#ffe9a855,transparent 68%);
    animation:csLight ${L}s ease-in-out infinite;
}
.cs-stage::after {
    content:"";
    position:absolute;
    left:15%;
    right:15%;
    bottom:8%;
    height:${u(2)};
    background:#ffcc78;
    box-shadow:0 0 ${u(8)} #ffb547;
}
@keyframes csOpen {
    0%,15% { transform:scaleX(1); }
    40%,75% { transform:scaleX(.55); }
    100% { transform:scaleX(1); }
}
@keyframes csLight {
    0%,100% { opacity:.35; }
    50% { opacity:1; }
}`;

    return doc(css, `
        <div class="cs-stage">
            <div class="cs-light"></div>
            <div class="cs-curtain left"></div>
            <div class="cs-curtain right"></div>
        </div>
        ${textBlock(name, p, 62, greeting)}
    `, w);
}

/* ---------- 10. Bullseye Achievement ---------- */
function bullseye(name: string, w: W, greeting: string): string {
    const p = pal("#102b4e", "#050d20", "#ffffff", "#7dd3fc", "#38bdf8");

    const css = BASE(p) + `
.bs-target {
    position:absolute;
    left:50%;
    top:39%;
    width:${u(48)};
    height:${u(48)};
    transform:translate(-50%,-50%);
    border-radius:50%;
    background:repeating-radial-gradient(
        circle,
        #ffffff 0 ${u(4)},
        #e53e70 ${u(4)} ${u(8)}
    );
    box-shadow:0 0 ${u(7)} #38bdf866;
}
.bs-center {
    position:absolute;
    left:50%;
    top:50%;
    width:${u(10)};
    height:${u(10)};
    border-radius:50%;
    background:#ffd166;
    transform:translate(-50%,-50%);
    box-shadow:0 0 ${u(5)} #ffd166;
}
.bs-arrow {
    position:absolute;
    left:50%;
    top:13%;
    width:${u(2)};
    height:${u(32)};
    background:linear-gradient(#fff,#94a3b8);
    transform:translateX(-50%) rotate(35deg);
    transform-origin:50% 100%;
    animation:bsHit ${L}s ease-in-out infinite;
}
.bs-arrow::before {
    content:"";
    position:absolute;
    top:0;
    left:${u(-2)};
    width:${u(6)};
    height:${u(6)};
    background:#7dd3fc;
    clip-path:polygon(50% 0,100% 100%,0 100%);
}
.bs-arrow::after {
    content:"";
    position:absolute;
    bottom:0;
    left:${u(-2)};
    width:${u(6)};
    height:${u(6)};
    background:#f59e0b;
    clip-path:polygon(50% 100%,0 0,100% 0);
}
.bs-pulse {
    position:absolute;
    left:50%;
    top:39%;
    width:${u(55)};
    height:${u(55)};
    border:${u(1)} solid #7dd3fc;
    border-radius:50%;
    transform:translate(-50%,-50%);
    animation:bsPulse ${L}s ease-out infinite;
}
@keyframes bsHit {
    0%,20% { transform:translate(-50%,-40%) rotate(35deg); }
    40%,100% { transform:translate(-50%,0) rotate(35deg); }
}
@keyframes bsPulse {
    0%,100% { transform:translate(-50%,-50%) scale(.85); opacity:.2; }
    50% { transform:translate(-50%,-50%) scale(1.15); opacity:.9; }
}`;

    return doc(css, `
        <div class="bs-pulse"></div>
        <div class="bs-target"><i class="bs-center"></i></div>
        <div class="bs-arrow"></div>
        ${textBlock(name, p, 68, greeting)}
    `, w);
}

/* --------------------------------------------------
   FIREWORK HELPERS
-------------------------------------------------- */

const FIREWORK_COLORS = [
    "#ff4d6d",
    "#ffd166",
    "#4cc9f0",
    "#7bd88f",
    "#b980f0",
    "#ffffff",
];

function makeFireworkBurst(
    seed: number,
    x: number,
    y: number,
    color: string,
    count = 14,
    delay = "0s"
): string {
    const r = rng(seed);

    const rays = Array.from({ length: count }, () => {
        const angle = f1(r() * 360);
        const distance = u(10 + r() * 13);

        return `
            <i class="fw-ray" style="
                --angle:${angle}deg;
                --distance:${distance};
                --ray-color:${color};
                animation-delay:${delay};
            "></i>
        `;
    }).join("");

    return `
        <div class="fw-burst" style="left:${x}%;top:${y}%">
            ${rays}
            <i class="fw-flash" style="--ray-color:${color};animation-delay:${delay}"></i>
        </div>
    `;
}

const FIREWORK_CSS = `
.fw-burst {
    position:absolute;
    width:1px;
    height:1px;
    transform:translate(-50%,-50%);
    pointer-events:none;
}

.fw-ray {
    position:absolute;
    left:0;
    top:0;
    width:${u(1.2)};
    height:${u(5)};
    border-radius:50%;
    background:var(--ray-color);
    box-shadow:0 0 ${u(3)} var(--ray-color);
    transform-origin:center;
    opacity:0;
    animation:fw-explode ${L}s ease-out infinite;
}

.fw-flash {
    position:absolute;
    left:0;
    top:0;
    width:${u(4)};
    height:${u(4)};
    border-radius:50%;
    background:var(--ray-color);
    box-shadow:0 0 ${u(8)} var(--ray-color);
    transform:translate(-50%,-50%);
    animation:fw-flash ${L}s ease-out infinite;
}

@keyframes fw-explode {
    0% {
        opacity:0;
        transform:rotate(var(--angle)) translateY(0) scaleY(.2);
    }
    12% { opacity:1; }
    65% {
        opacity:1;
        transform:rotate(var(--angle)) translateY(var(--distance)) scaleY(1);
    }
    100% {
        opacity:0;
        transform:rotate(var(--angle)) translateY(var(--distance)) scaleY(.3);
    }
}

@keyframes fw-flash {
    0%,100% {
        opacity:0;
        transform:translate(-50%,-50%) scale(.2);
    }
    12% { opacity:1; }
    35% {
        opacity:.5;
        transform:translate(-50%,-50%) scale(2);
    }
    55% { opacity:0; }
}
`;

/* --------------------------------------------------
   11. COLOURFUL FIREWORK BURST
   Multiple colourful explosions in the night sky.
-------------------------------------------------- */

function fireworkBurst(name: string, w: W, greeting: string): string {
    const p = pal("#180d45", "#030617", "#ffffff", "#ffe17a", "#a855f7");

    const bursts = [
        makeFireworkBurst(201, 25, 28, "#ff4d6d", 16, "-1s"),
        makeFireworkBurst(202, 72, 25, "#ffd166", 18, "-2s"),
        makeFireworkBurst(203, 50, 43, "#4cc9f0", 15, "-3s"),
        makeFireworkBurst(204, 85, 47, "#b980f0", 14, "-1.5s"),
    ].join("");

    const css = BASE(p) + COMMON_CSS + FIREWORK_CSS;

    return doc(css, `
        ${makeStars(205, 35)}
        ${bursts}
        ${makeConfetti(206, 18)}
        ${textBlock(name, p, 67, greeting)}
    `, w);
}

/* --------------------------------------------------
   12. GOLDEN FIREWORKS
   Premium golden explosions with glowing particles.
-------------------------------------------------- */

function goldenFireworks(name: string, w: W, greeting: string): string {
    const p = pal("#321006", "#100509", "#fff4d0", "#ffd166", "#ffb703");

    const bursts = [
        makeFireworkBurst(211, 25, 31, "#ffd166", 20, "-1s"),
        makeFireworkBurst(212, 72, 30, "#fff1a8", 20, "-2s"),
        makeFireworkBurst(213, 50, 42, "#ff9f1c", 18, "-3s"),
        makeFireworkBurst(214, 90, 15, "#ffd166", 14, "-.5s"),
    ].join("");

    const css = BASE(p) + COMMON_CSS + FIREWORK_CSS + `
.gf-glow {
    position:absolute;
    left:50%;
    top:37%;
    width:${u(85)};
    height:${u(65)};
    transform:translate(-50%,-50%);
    background:radial-gradient(ellipse,#ffb70333,transparent 70%);
    animation:cg-glow ${L / 2}s ease-in-out infinite;
}
`;

    return doc(css, `
        ${makeStars(215, 38)}
        <div class="gf-glow"></div>
        ${bursts}
        ${textBlock(name, p, 67, greeting)}
    `, w);
}

/* --------------------------------------------------
   13. FIREWORK ROCKETS
   Rockets rise into the sky and explode into stars.
-------------------------------------------------- */

function fireworkRockets(name: string, w: W, greeting: string): string {
    const p = pal("#071c48", "#020719", "#ffffff", "#83e7ff", "#38bdf8");

    const rockets = [
        [18, 55, "#ff4d6d", "-1s"],
        [48, 60, "#ffd166", "-2s"],
        [78, 55, "#b980f0", "-3s"],
    ];

    const rocketMarkup = rockets.map(([x, y, color, delay], i) => `
        <div class="fr-rocket" style="
            left:${x}%;
            top:${y}%;
            --rocket-color:${color};
            animation-delay:${delay};
        ">
            <i class="fr-body"></i>
            <i class="fr-fire"></i>
        </div>
    `).join("");

    const bursts = [
        makeFireworkBurst(221, 18, 24, "#ff4d6d", 14, "-1s"),
        makeFireworkBurst(222, 48, 18, "#ffd166", 16, "-2s"),
        makeFireworkBurst(223, 78, 23, "#b980f0", 14, "-3s"),
    ].join("");

    const css = BASE(p) + COMMON_CSS + FIREWORK_CSS + `
.fr-rocket {
    position:absolute;
    width:${u(5)};
    height:${u(16)};
    transform:translate(-50%,-50%);
    animation:fr-launch ${L}s ease-in-out infinite;
}

.fr-body {
    position:absolute;
    inset:0 15% 25%;
    border-radius:50% 50% 20% 20%;
    background:linear-gradient(90deg,#fff,var(--rocket-color),#fff);
    box-shadow:0 0 ${u(3)} var(--rocket-color);
}

.fr-body:before {
    content:"";
    position:absolute;
    top:-20%;
    left:0;
    width:100%;
    height:25%;
    background:var(--rocket-color);
    clip-path:polygon(50% 0,100% 100%,0 100%);
}

.fr-fire {
    position:absolute;
    left:30%;
    bottom:0;
    width:40%;
    height:35%;
    border-radius:50%;
    background:linear-gradient(#fff,#ffd166,#ff4d6d);
    filter:drop-shadow(0 0 ${u(3)} #ff9f1c);
    animation:fr-flame .2s ease-in-out infinite alternate;
}

@keyframes fr-launch {
    0%,15% {
        opacity:0;
        transform:translate(-50%,${u(15)});
    }
    30%,60% {
        opacity:1;
        transform:translate(-50%,-${u(30)});
    }
    75%,100% {
        opacity:0;
        transform:translate(-50%,-${u(45)});
    }
}

@keyframes fr-flame {
    from { transform:scale(.7); }
    to { transform:scale(1.3); }
}
`;

    return doc(css, `
        ${makeStars(224, 30)}
        ${rocketMarkup}
        ${bursts}
        ${textBlock(name, p, 68, greeting)}
    `, w);
}

/* --------------------------------------------------
   14. CELEBRATION NIGHT
   Big fireworks exploding across the entire sky.
-------------------------------------------------- */

function celebrationNight(name: string, w: W, greeting: string): string {
    const p = pal("#100d3d", "#020313", "#ffffff", "#ffdc70", "#8b5cf6");

    const bursts = [
        makeFireworkBurst(231, 15, 20, "#ff4d6d", 17, "-1s"),
        makeFireworkBurst(232, 50, 17, "#ffd166", 20, "-2s"),
        makeFireworkBurst(233, 85, 20, "#4cc9f0", 18, "-3s"),
        makeFireworkBurst(234, 30, 42, "#7bd88f", 15, "-2.5s"),
        makeFireworkBurst(235, 70, 43, "#b980f0", 18, "-1.5s"),
        makeFireworkBurst(236, 50, 34, "#ff9f1c", 16, "-.5s"),
    ].join("");

    const css = BASE(p) + COMMON_CSS + FIREWORK_CSS + `
.cn-horizon {
    position:absolute;
    left:0;
    right:0;
    bottom:0;
    height:25%;
    background:linear-gradient(transparent,#09091f);
}
.cn-ground {
    position:absolute;
    left:0;
    right:0;
    bottom:0;
    height:${u(3)};
    background:#5b4b9a;
    box-shadow:0 0 ${u(8)} #8b5cf6;
}
`;

    return doc(css, `
        ${makeStars(237, 45)}
        ${bursts}
        <div class="cn-horizon"></div>
        <div class="cn-ground"></div>
        ${textBlock(name, p, 68, greeting)}
    `, w);
}

/* --------------------------------------------------
   15. CONFETTI FIREWORKS
   Fireworks, colourful confetti and sparkling stars.
-------------------------------------------------- */

function confettiFireworks(name: string, w: W, greeting: string): string {
    const p = pal("#35104e", "#10051f", "#fff5ff", "#ffcf70", "#ec4899");

    const bursts = [
        makeFireworkBurst(241, 22, 27, "#ff4d6d", 16, "-1s"),
        makeFireworkBurst(242, 75, 26, "#ffd166", 18, "-2s"),
        makeFireworkBurst(243, 50, 38, "#4cc9f0", 17, "-3s"),
        makeFireworkBurst(244, 88, 45, "#7bd88f", 14, "-1.5s"),
    ].join("");

    const css = BASE(p) + COMMON_CSS + FIREWORK_CSS;

    return doc(css, `
        ${makeStars(245, 30)}
        ${bursts}
        ${makeConfetti(246, 45)}
        ${textBlock(name, p, 66, greeting)}
    `, w);
}


/* --------------------------------------------------
   EXPORT
-------------------------------------------------- */

export const CONGRATS_BUILDERS: Record<string, Builder> = {
    "congrats-trophy": goldenTrophy,
    "congrats-graduation": graduation,
    "congrats-achievement": achievement,
    "congrats-grand-celebration": grandCelebration,
    "congrats-rocket-success": rocketSuccess,
    "congrats-crown-reveal": crownReveal,
    "congrats-finish-line": finishLine,
    "congrats-puzzle-solved": puzzleComplete,
    "congrats-curtain-spotlight": curtainSpotlight,
    "congrats-bullseye": bullseye,
    // New firework animations
    "congrats-firework-burst": fireworkBurst,
    "congrats-golden-fireworks": goldenFireworks,
    "congrats-firework-rockets": fireworkRockets,
    "congrats-celebration-night": celebrationNight,
    "congrats-confetti-fireworks": confettiFireworks,
};
