/**
 * Business Animation Studio: template metadata. Safe for server AND browser (no Node imports).
 * Everything a customer sees in a business GIF (names, prices, claims, logo) comes from the customer's own
 * fields and files. Templates only decide the look and movement. No AI is involved, so there is no AI cost.
 */
export type BizKind = "product-ad" | "logo" | "banner" | "showcase";

export const BIZ_KINDS: { id: BizKind; label: string; emoji: string; blurb: string; priceUsd: number }[] = [
  { id: "product-ad", label: "Product ads", emoji: "🛍️", blurb: "Your product photo, name, price and discount in motion.", priceUsd: 0.49 },
  { id: "logo", label: "Animated logos", emoji: "✨", blurb: "Your logo, untouched, with a reveal, glow or shine.", priceUsd: 0.29 },
  { id: "banner", label: "Promo banners", emoji: "📣", blurb: "Headline, price, discount and a call to action.", priceUsd: 0.29 },
  { id: "showcase", label: "Product showcases", emoji: "🖼️", blurb: "2 to 4 product photos with smooth transitions.", priceUsd: 0.79 },
];

export type BizSizeId = "square" | "portrait" | "story" | "landscape" | "wide";

export const BIZ_SIZES: Record<BizSizeId, { label: string; hint: string; ratio: [number, number] }> = {
  square: { label: "Square 1:1", hint: "Instagram, Facebook, WhatsApp", ratio: [1, 1] },
  portrait: { label: "Portrait 4:5", hint: "Instagram & Facebook feed", ratio: [4, 5] },
  story: { label: "Story 9:16", hint: "Stories, Reels, WhatsApp status", ratio: [9, 16] },
  landscape: { label: "Landscape 16:9", hint: "YouTube, website, TV", ratio: [16, 9] },
  wide: { label: "Wide banner 3:1", hint: "Facebook cover, web header", ratio: [3, 1] },
};
export const BIZ_SIZE_IDS = Object.keys(BIZ_SIZES) as BizSizeId[];

/** Pixel size for a size id: the long side is `maxSize`. */
export function bizDimensions(size: BizSizeId, maxSize: number): { w: number; h: number } {
  const [a, b] = BIZ_SIZES[size].ratio;
  const k = maxSize / Math.max(a, b);
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return { w: even(a * k), h: even(b * k) };
}

export type Palette = { id: string; label: string; bg1: string; bg2: string; accent: string; accent2: string; text: string; dark: boolean };

export const PALETTES: Palette[] = [
  { id: "midnight", label: "Midnight gold", bg1: "#2b2447", bg2: "#080910", accent: "#ffd23f", accent2: "#ff9f1c", text: "#ffffff", dark: true },
  { id: "sunset", label: "Sunset", bg1: "#ff7a45", bg2: "#6a1b9a", accent: "#ffe066", accent2: "#ff3d71", text: "#ffffff", dark: true },
  { id: "ocean", label: "Ocean", bg1: "#1976d2", bg2: "#04182c", accent: "#5eead4", accent2: "#38bdf8", text: "#ffffff", dark: true },
  { id: "forest", label: "Forest", bg1: "#0f9d6b", bg2: "#04231a", accent: "#ffd166", accent2: "#a7f3d0", text: "#ffffff", dark: true },
  { id: "rose", label: "Rose", bg1: "#ff5d8f", bg2: "#430a3a", accent: "#fff1a8", accent2: "#ffb3c7", text: "#ffffff", dark: true },
  { id: "light", label: "Clean light", bg1: "#ffffff", bg2: "#dbe7f5", accent: "#e63946", accent2: "#ff8a5c", text: "#1b2233", dark: false },
];

export type FieldKey = "brand" | "headline" | "subtitle" | "tagline" | "price" | "oldPrice" | "discount" | "cta" | "caption1" | "caption2" | "caption3" | "caption4";
export type BizField = { key: FieldKey; label: string; placeholder: string; maxLength: number; required?: boolean };

const FIELD: Record<FieldKey, Omit<BizField, "key">> = {
  brand: { label: "Brand or shop name", placeholder: "Ahmed Electronics", maxLength: 30 },
  headline: { label: "Headline", placeholder: "Mega Sale", maxLength: 40 },
  subtitle: { label: "Short description", placeholder: "Original. 1 year warranty.", maxLength: 60 },
  tagline: { label: "Tagline", placeholder: "Quality you can trust", maxLength: 50 },
  price: { label: "Price", placeholder: "Rs. 1,999", maxLength: 18 },
  oldPrice: { label: "Old price (crossed out)", placeholder: "Rs. 2,999", maxLength: 18 },
  discount: { label: "Discount badge", placeholder: "30% OFF", maxLength: 14 },
  cta: { label: "Button text", placeholder: "Order on WhatsApp", maxLength: 28 },
  caption1: { label: "Photo 1 caption", placeholder: "Black", maxLength: 30 },
  caption2: { label: "Photo 2 caption", placeholder: "White", maxLength: 30 },
  caption3: { label: "Photo 3 caption", placeholder: "Blue", maxLength: 30 },
  caption4: { label: "Photo 4 caption", placeholder: "Red", maxLength: 30 },
};

export const fieldDef = (key: FieldKey, patch: Partial<BizField> = {}): BizField => ({ key, ...FIELD[key], ...patch });

export type ImageSlot = { key: "product" | "logo" | "image1" | "image2" | "image3" | "image4"; label: string; required: boolean };

export type BizTemplate = {
  id: string;
  /** Catalog slug used by the generation pipeline. */
  slug: string;
  kind: BizKind;
  name: string;
  tagline: string;
  emoji: string;
  palette: string;
  fields: BizField[];
  images: ImageSlot[];
  seconds: 4 | 8;
  defaultSize: BizSizeId;
  popular?: boolean;
  /** Example text used for the gallery sample GIF (clearly sample data, not real prices). */
  sample: Partial<Record<FieldKey, string>>;
};

const productSlot: ImageSlot = { key: "product", label: "Product photo", required: true };
const logoSlot: ImageSlot = { key: "logo", label: "Your logo (PNG with transparent background is best)", required: true };
const optionalImage: ImageSlot = { key: "product", label: "Photo or logo (optional)", required: false };
const showcaseSlots: ImageSlot[] = [1, 2, 3, 4].map((n) => ({ key: `image${n}` as ImageSlot["key"], label: `Photo ${n}`, required: n <= 2 }));

const adFields = [fieldDef("headline", { label: "Product name", placeholder: "Wireless Earbuds", required: true }), fieldDef("brand"), fieldDef("subtitle"), fieldDef("price"), fieldDef("oldPrice"), fieldDef("discount"), fieldDef("cta")];
const logoFields = [fieldDef("brand", { label: "Brand name (optional)" }), fieldDef("tagline")];
const bannerFields = [fieldDef("headline", { placeholder: "Eid Sale", required: true }), fieldDef("subtitle"), fieldDef("price"), fieldDef("oldPrice"), fieldDef("discount"), fieldDef("cta", { placeholder: "Shop now" }), fieldDef("brand")];
const showFields = [fieldDef("headline", { label: "Title", placeholder: "New Collection", required: true }), fieldDef("brand"), fieldDef("cta"), fieldDef("caption1"), fieldDef("caption2"), fieldDef("caption3"), fieldDef("caption4")];

type Row = [id: string, name: string, tagline: string, emoji: string, palette: string, sample: BizTemplate["sample"], extra?: Partial<BizTemplate>];

const mk = (kind: BizKind, rows: Row[]): BizTemplate[] =>
  rows.map(([id, name, tagline, emoji, palette, sample, extra]) => ({
    id,
    slug: `biz-${id}`,
    kind,
    name,
    tagline,
    emoji,
    palette,
    sample,
    seconds: kind === "showcase" ? 8 : 4,
    defaultSize: kind === "banner" ? "landscape" : "square",
    fields: kind === "product-ad" ? adFields : kind === "logo" ? logoFields : kind === "banner" ? bannerFields : showFields,
    images: kind === "product-ad" ? [productSlot] : kind === "logo" ? [logoSlot] : kind === "banner" ? [optionalImage] : showcaseSlots,
    ...extra,
  }));

const adSample = { headline: "Wireless Earbuds", brand: "Sample Store", subtitle: "Sample text only", price: "Rs. 1,999", oldPrice: "Rs. 2,999", discount: "30% OFF", cta: "Order now" };

export const BUSINESS_TEMPLATES: BizTemplate[] = [
  ...mk("product-ad", [
    ["ad-spotlight", "Spotlight", "Dark stage, glowing product", "🔦", "midnight", adSample, { popular: true }],
    ["ad-flash-sale", "Flash sale", "Rotating rays and a big badge", "⚡", "sunset", adSample, { popular: true }],
    ["ad-fresh", "Fresh & bright", "Soft colour blobs, friendly look", "🍃", "forest", adSample],
    ["ad-neon", "Neon night", "Moving neon grid", "🌃", "ocean", adSample],
    ["ad-luxury", "Luxury shine", "Gold sheen sweeping across", "👑", "midnight", adSample],
    ["ad-pop-card", "Pop card", "Clean light card with floating shapes", "🎯", "light", adSample],
  ]),
  ...mk("logo", [
    ["logo-glow-reveal", "Glow reveal", "Logo pops in with a glow", "💫", "midnight", { brand: "Sample Brand", tagline: "Your tagline here" }, { popular: true }],
    ["logo-flip", "3D flip", "Logo flips into view", "🔄", "ocean", { brand: "Sample Brand", tagline: "Your tagline here" }],
    ["logo-pulse-ring", "Pulse rings", "Rings ripple from your logo", "🔔", "sunset", { brand: "Sample Brand", tagline: "Your tagline here" }],
    ["logo-shine", "Shine sweep", "A light sweeps across the logo", "✨", "light", { brand: "Sample Brand", tagline: "Your tagline here" }],
    ["logo-sparkle", "Float & sparkle", "Gently floating, twinkling stars", "🌟", "rose", { brand: "Sample Brand", tagline: "Your tagline here" }],
  ]),
  ...mk("banner", [
    ["banner-sale", "Big sale", "Bold discount banner", "🏷️", "sunset", { headline: "Big Sale", subtitle: "Sample text only", discount: "50% OFF", cta: "Shop now", brand: "Sample Store" }, { popular: true }],
    ["banner-announce", "Announcement", "Clean headline and button", "📢", "ocean", { headline: "We are open!", subtitle: "Sample text only", cta: "Visit us", brand: "Sample Store" }],
    ["banner-festival", "Festival offer", "Lanterns and sparkles", "🌙", "midnight", { headline: "Festival Offer", subtitle: "Sample text only", discount: "25% OFF", cta: "Order now", brand: "Sample Store" }],
    ["banner-new-arrival", "New arrival", "Fresh, light and modern", "🆕", "light", { headline: "New Arrival", subtitle: "Sample text only", price: "Rs. 2,499", cta: "See more", brand: "Sample Store" }],
    ["banner-opening", "Grand opening", "Confetti celebration", "🎊", "rose", { headline: "Grand Opening", subtitle: "Sample text only", cta: "Join us", brand: "Sample Store" }],
  ]),
  ...mk("showcase", [
    ["show-slide", "Slide show", "Photos slide in one by one", "➡️", "midnight", { headline: "New Collection", brand: "Sample Store", cta: "Order now", caption1: "Style one", caption2: "Style two", caption3: "Style three" }, { popular: true }],
    ["show-fade", "Soft fade", "Gentle cross-fade", "🌫️", "light", { headline: "New Collection", brand: "Sample Store", cta: "Order now", caption1: "Style one", caption2: "Style two", caption3: "Style three" }],
    ["show-zoom", "Slow zoom", "Cinematic push-in on each photo", "🎞️", "ocean", { headline: "New Collection", brand: "Sample Store", cta: "Order now", caption1: "Style one", caption2: "Style two", caption3: "Style three" }],
    ["show-pop", "Pop in", "Photos bounce in, one at a time", "🎈", "sunset", { headline: "New Collection", brand: "Sample Store", cta: "Order now", caption1: "Style one", caption2: "Style two", caption3: "Style three" }],
  ]),
];

export const BIZ_BY_SLUG: Record<string, BizTemplate> = Object.fromEntries(BUSINESS_TEMPLATES.map((t) => [t.slug, t]));
export const getBizTemplate = (slugOrId: string): BizTemplate | null => BIZ_BY_SLUG[slugOrId] ?? BIZ_BY_SLUG[`biz-${slugOrId}`] ?? null;
export const bizPrice = (t: BizTemplate) => BIZ_KINDS.find((k) => k.id === t.kind)!.priceUsd;

export type PanelChoice = "auto" | "white" | "dark" | "none";
export type BizOptions = { size: BizSizeId; palette: string; panel: PanelChoice; fields: Partial<Record<FieldKey, string>> };

/** Clamps whatever the client sent. Text is plain text only (it is HTML-escaped again at render time). */
export function normalizeBizOptions(t: BizTemplate, raw: unknown): BizOptions {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const size = BIZ_SIZE_IDS.includes(o.size as BizSizeId) ? (o.size as BizSizeId) : t.defaultSize;
  const palette = PALETTES.some((p) => p.id === o.palette) ? String(o.palette) : t.palette;
  const panel = (["auto", "white", "dark", "none"] as const).includes(o.panel as PanelChoice) ? (o.panel as PanelChoice) : "auto";
  const f = (o.fields && typeof o.fields === "object" ? o.fields : {}) as Record<string, unknown>;
  const fields: BizOptions["fields"] = {};
  for (const def of t.fields) {
    // eslint-disable-next-line no-control-regex
    const v = typeof f[def.key] === "string" ? (f[def.key] as string).replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, def.maxLength) : "";
    if (v) fields[def.key] = v;
  }
  return { size, palette, panel, fields };
}

/** What still has to be filled in before the customer can pay. */
export function missingForBiz(t: BizTemplate, options: BizOptions, haveImages: string[]): string[] {
  const out: string[] = [];
  for (const f of t.fields) if (f.required && !options.fields[f.key]) out.push(f.label);
  for (const s of t.images) if (s.required && !haveImages.includes(s.key)) out.push(s.label.split(" (")[0]);
  return out;
}
