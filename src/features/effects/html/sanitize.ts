import { getBrowser, htmlLimiter } from "./browser";

export class DesignError extends Error {}

export const MAX_DESIGN_CHARS = 40_000;
const MAX_ELEMENTS = 500;

/**
 * The design comes from an AI model, so it is untrusted. It is parsed by Chromium's real HTML
 * parser inside an inert <template> (no script runs, no resource loads) and rebuilt from an
 * allowlist of tags and attributes. Anything that could load a resource or run code is dropped.
 */
const ALLOWED_TAGS = [
  "div", "span", "p", "b", "i", "u", "strong", "em", "br", "h1", "h2", "h3", "style",
  "svg", "g", "path", "circle", "ellipse", "rect", "line", "polygon", "polyline", "defs",
  "lineargradient", "radialgradient", "stop", "text", "tspan", "clippath",
];
const ALLOWED_ATTRS = [
  "class", "id", "style", "viewbox", "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "x2", "y1", "y2",
  "width", "height", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "opacity",
  "fill-opacity", "stroke-opacity", "transform", "points", "offset", "stop-color", "stop-opacity",
  "gradientunits", "gradienttransform", "text-anchor", "font-size", "font-weight", "font-family",
  "preserveaspectratio", "xmlns", "clip-path", "fx", "fy", "letter-spacing", "dominant-baseline",
];

/**
 * Runs inside the page. Kept as a plain JavaScript string (not a TS function) so compilers such as
 * tsx/esbuild cannot inject helpers into it. Returns sanitized HTML plus counts.
 */
const SANITIZE_SCRIPT = `(cfg) => {
  const cleanCss = (css) => css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/@font-face\\s*\\{[^}]*\\}/gi, "")
    .replace(/url\\(\\s*(['"]?)(?!#)[^)]*\\)/gi, "none")
    .replace(/expression\\s*\\(|javascript:|behavior\\s*:|-moz-binding/gi, "");
  const t = document.createElement("template");
  t.innerHTML = cfg.html;
  let removed = 0;
  const all = Array.from(t.content.querySelectorAll("*"));
  if (all.length > cfg.maxElements) return { error: "too many elements (" + all.length + ")" };
  for (const el of all) {
    const name = el.localName.toLowerCase();
    if (!cfg.tags.includes(name)) { el.remove(); removed++; continue; }
    for (const attr of Array.from(el.attributes)) {
      const an = attr.name.toLowerCase();
      if (!cfg.attrs.includes(an)) { el.removeAttribute(attr.name); removed++; }
      else if (an === "style") { el.setAttribute("style", cleanCss(attr.value)); }
      else if (/url\\(\\s*(['"]?)(?!#)|javascript:/i.test(attr.value)) { el.removeAttribute(attr.name); removed++; }
    }
    if (name === "style") el.textContent = cleanCss(el.textContent || "");
  }
  return { html: t.innerHTML, elements: all.length, removed };
}`;

export async function sanitizeDesign(raw: string): Promise<{ html: string; elements: number; removed: number; animations: number }> {
  if (typeof raw !== "string" || raw.trim().length < 20) throw new DesignError("The design was empty.");
  if (raw.length > MAX_DESIGN_CHARS) throw new DesignError("The design was too large.");
  return htmlLimiter(async () => {
    const ctx = await (await getBrowser()).newContext({ javaScriptEnabled: false });
    try {
      const page = await ctx.newPage();
      await page.setContent("<!doctype html><html><body></body></html>");
      const cfg = { html: raw, tags: ALLOWED_TAGS, attrs: ALLOWED_ATTRS, maxElements: MAX_ELEMENTS };
      const res = (await page.evaluate(`(${SANITIZE_SCRIPT})(${JSON.stringify(cfg)})`)) as
        | { error: string }
        | { html: string; elements: number; removed: number };
      if ("error" in res) throw new DesignError(`The design was rejected: ${res.error}.`);
      // Count real animations so a motionless design is rejected now, not after the customer has paid.
      await page.setContent(`<!doctype html><html><body><div>${res.html}</div></body></html>`);
      const animations = (await page.evaluate("document.getAnimations().length")) as number;
      return { html: res.html, elements: res.elements, removed: res.removed, animations };
    } finally {
      await ctx.close();
    }
  });
}
