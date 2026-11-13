import sharp from "sharp";
import { toBizImage } from "@/features/business/render";
import type { BizInputs } from "@/features/business/build";

/** Illustrated stand-ins (clearly generic) used for gallery samples and tests. */
const productSvg = (hue: string, label = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hue}"/><stop offset="1" stop-color="#1b1f3a"/></linearGradient></defs>
<path d="M150 330c0-110 65-190 150-190s150 80 150 190" fill="none" stroke="url(#g)" stroke-width="34" stroke-linecap="round"/>
<rect x="110" y="320" width="90" height="170" rx="40" fill="url(#g)"/><rect x="400" y="320" width="90" height="170" rx="40" fill="url(#g)"/>
<rect x="128" y="350" width="30" height="100" rx="15" fill="#ffffff55"/><rect x="418" y="350" width="30" height="100" rx="15" fill="#ffffff55"/>
<text x="300" y="560" font-size="38" text-anchor="middle" font-family="DejaVu Sans" fill="#ffffffcc">${label}</text></svg>`;

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
<defs><linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5d8f"/><stop offset="1" stop-color="#6a4cff"/></linearGradient></defs>
<circle cx="250" cy="250" r="200" fill="url(#l)"/><path d="M170 300 250 150 330 300Z" fill="#fff"/><circle cx="250" cy="330" r="34" fill="#ffd23f"/></svg>`;

export async function sampleBizInputs(): Promise<BizInputs> {
  const png = (svg: string) => sharp(Buffer.from(svg)).png().toBuffer();
  return {
    product: await toBizImage(await png(productSvg("#4fd1ff"))),
    logo: await toBizImage(await png(logoSvg)),
    image1: await toBizImage(await png(productSvg("#ff7a45", "One"))),
    image2: await toBizImage(await png(productSvg("#34d399", "Two"))),
    image3: await toBizImage(await png(productSvg("#a78bfa", "Three"))),
  };
}
