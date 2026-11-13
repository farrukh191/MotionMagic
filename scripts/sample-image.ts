import sharp from "sharp";

/** An original illustrated "photo" used for gallery samples and tests (no real person involved). */
export type Variant = "base" | "smile" | "hero" | "dreamy";

/**
 * Variants are hand-drawn ILLUSTRATIONS standing in for what the AI image edit returns, used only for gallery
 * samples and tests: "smile" (bigger smile), "hero" (mask + cape), "dreamy" (pastel sky background).
 */
export async function sampleImage(size = 900, variant: Variant = "base"): Promise<Buffer> {
  const s = size / 900;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 900 900">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ecbff"/><stop offset="1" stop-color="#ffe9c7"/></linearGradient>
    <radialGradient id="fur" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffb457"/><stop offset="1" stop-color="#e8801f"/></radialGradient>
  </defs>
  <rect width="900" height="900" fill="url(#sky)"/>
  <circle cx="740" cy="170" r="80" fill="#fff4b8"/>
  <ellipse cx="200" cy="170" rx="120" ry="36" fill="#fff" opacity=".85"/><ellipse cx="270" cy="150" rx="80" ry="30" fill="#fff" opacity=".85"/>
  <path d="M0 700 Q250 590 520 680 T900 650 V900 H0Z" fill="#7bc67b"/>
  <path d="M0 780 Q300 700 600 770 T900 760 V900 H0Z" fill="#5aa95a"/>
  <path d="M230 330 L270 150 L400 260Z" fill="#e8801f"/><path d="M670 330 L630 150 L500 260Z" fill="#e8801f"/>
  <path d="M265 300 L285 200 L360 260Z" fill="#ffb0b0"/><path d="M635 300 L615 200 L540 260Z" fill="#ffb0b0"/>
  <ellipse cx="450" cy="470" rx="250" ry="215" fill="url(#fur)"/>
  <path d="M450 270 L430 340 L470 340Z M370 285 L372 345 L400 340Z M530 285 L528 345 L500 340Z" fill="#c8660f"/>
  <ellipse cx="450" cy="560" rx="120" ry="85" fill="#fff0dc"/>
  <ellipse cx="365" cy="440" rx="42" ry="52" fill="#fff"/><ellipse cx="535" cy="440" rx="42" ry="52" fill="#fff"/>
  <circle cx="372" cy="448" r="26" fill="#2a1a0a"/><circle cx="528" cy="448" r="26" fill="#2a1a0a"/>
  <circle cx="381" cy="437" r="9" fill="#fff"/><circle cx="537" cy="437" r="9" fill="#fff"/>
  <path d="M425 515 L475 515 L450 548Z" fill="#e76f7a"/>
  <path d="M450 548 Q450 590 410 592 M450 548 Q450 590 490 592" stroke="#4a2a12" stroke-width="7" fill="none" stroke-linecap="round"/>
  <g stroke="#4a2a12" stroke-width="5" stroke-linecap="round"><path d="M330 540 L230 520"/><path d="M330 565 L225 580"/><path d="M570 540 L670 520"/><path d="M570 565 L675 580"/></g>
  <path d="M300 640 Q450 720 600 640 L620 700 Q450 790 280 700Z" fill="#e63946"/>
  <circle cx="450" cy="735" r="34" fill="#ffd23f" stroke="#c9961a" stroke-width="6"/>
  <ellipse cx="300" cy="500" rx="34" ry="20" fill="#ff8a8a" opacity=".5"/><ellipse cx="600" cy="500" rx="34" ry="20" fill="#ff8a8a" opacity=".5"/>
  </svg>`;
  let out = svg;
  if (variant === "smile") {
    out = out.replace("</svg>", `<path d="M382 572 Q450 650 518 572 Q450 606 382 572Z" fill="#7a1f2b"/><path d="M410 600 Q450 628 490 600 Q450 616 410 600Z" fill="#ff8a95"/></svg>`);
  } else if (variant === "hero") {
    out = out
      .replace('<path d="M230 330', '<path d="M310 640 Q130 740 90 900 L810 900 Q770 740 590 640Z" fill="#c1121f"/><path d="M230 330')
      .replace('<ellipse cx="365" cy="440"', '<path d="M285 405 Q450 360 615 405 L625 470 Q545 505 505 470 Q450 450 395 470 Q355 505 275 470Z" fill="#1d3557"/><ellipse cx="365" cy="440"')
      .replace("</svg>", `<path d="M450 700 l-26 -22 h52z" fill="#ffd23f"/></svg>`);
  } else if (variant === "dreamy") {
    out = out
      .replace('<stop offset="0" stop-color="#8ecbff"/><stop offset="1" stop-color="#ffe9c7"/>', '<stop offset="0" stop-color="#c9b6ff"/><stop offset="0.6" stop-color="#ffc8e6"/><stop offset="1" stop-color="#ffe9c7"/>')
      .replace('<circle cx="740" cy="170" r="80" fill="#fff4b8"/>', '<circle cx="740" cy="170" r="95" fill="#fff4b8" opacity=".9"/><ellipse cx="640" cy="330" rx="150" ry="44" fill="#fff" opacity=".9"/><ellipse cx="740" cy="300" rx="100" ry="40" fill="#fff" opacity=".9"/><ellipse cx="140" cy="420" rx="130" ry="40" fill="#fff" opacity=".85"/>');
  }
  return sharp(Buffer.from(out)).resize(size, size).png().toBuffer();
}
