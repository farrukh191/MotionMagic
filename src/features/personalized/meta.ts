/**
 * Personalized birthday GIFs: 5 fixed templates, one input (the name). Safe for server and browser.
 * No uploads and no free-text prompts: the customer can only choose a template and type a name, so there is
 * no AI cost and nothing unexpected can be generated.
 */
export type PersonalCategory = { id: string; label: string; emoji: string; blurb: string };

/**
 * Categories shown on the site. A category with no template yet shows "Coming soon" (no fake designs).
 * To add designs later: add an entry to PERSONAL_TEMPLATES below with that category id, and add its scene to
 * BUILDERS in build.ts. Nothing else needs to change (see README: "Adding a category or template").
 */
export const PERSONAL_CATEGORIES: PersonalCategory[] = [
  { id: "birthday", label: "Birthday", emoji: "🎂", blurb: "Happy Birthday with their name" },
  { id: "festival", label: "Festival", emoji: "🌙", blurb: "Eid, Ramadan, Independence Day and more" },
  { id: "wedding", label: "Wedding", emoji: "💍", blurb: "Mubarak to the happy couple" },
  { id: "anniversary", label: "Anniversary", emoji: "💞", blurb: "Celebrate years together" },
  { id: "love", label: "Love & Romance", emoji: "💖", blurb: "Say it with a GIF" },
  { id: "congratulations", label: "Congratulations", emoji: "🏆", blurb: "Success, results, new job" },
  { id: "thankyou", label: "Thank You", emoji: "🙏", blurb: "Show your gratitude" },
  { id: "goodmorning", label: "Good Morning", emoji: "🌅", blurb: "Start someone's day with a smile" },
  { id: "newbaby", label: "New Baby", emoji: "👶", blurb: "Welcome the little one" },
  { id: "graduation", label: "Graduation", emoji: "🎓", blurb: "Celebrate the big day" },
];

export type PersonalTemplate = {
  id: string;
  category: string;
  /** The words above the name, e.g. "Happy Birthday". The GIF reads "<greeting> <Name>!". */
  greeting: string;
  /** Catalog slug used by the generation pipeline. */
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  /** Card accent (CSS colour) for the selector. */
  accent: string;
};

export const PERSONAL_TEMPLATES: PersonalTemplate[] = [
  { id: "balloons", category: "birthday", greeting: "Happy Birthday", slug: "bday-balloons", name: "Balloons Celebration", tagline: "Colourful balloons float up", emoji: "🎈", accent: "#ff6fa5" },
  { id: "cake", category: "birthday", greeting: "Happy Birthday", slug: "bday-cake", name: "Birthday Cake", tagline: "Candles flicker on a sweet cake", emoji: "🎂", accent: "#ffb347" },
  { id: "flowers", category: "birthday", greeting: "Happy Birthday", slug: "bday-flowers", name: "Beautiful Flowers", tagline: "Blooming flowers and soft petals", emoji: "🌸", accent: "#f78fb3" },
  { id: "confetti", category: "birthday", greeting: "Happy Birthday", slug: "bday-confetti", name: "Colourful Confetti", tagline: "A party of falling confetti", emoji: "🎉", accent: "#7c5cff" },
  { id: "golden", category: "birthday", greeting: "Happy Birthday", slug: "bday-golden", name: "Golden Celebration", tagline: "Shimmering gold and sparkle", emoji: "✨", accent: "#f5c542" },
  { id: "eid-moon", category: "festival", greeting: "Eid Mubarak", slug: "fest-eid-moon", name: "Eid Moon Glow", tagline: "A glowing crescent over a starry night", emoji: "🌙", accent: "#ffd45e" },
  { id: "eid-lanterns", category: "festival", greeting: "Eid Mubarak", slug: "fest-eid-lanterns", name: "Eid Lanterns", tagline: "Swinging lanterns in a warm glow", emoji: "🏮", accent: "#ffb703" },
  { id: "ramadan-nights", category: "festival", greeting: "Ramadan Mubarak", slug: "fest-ramadan-nights", name: "Ramadan Nights", tagline: "Mosque skyline under a crescent moon", emoji: "🕌", accent: "#a855f7" },
  { id: "eid-adha-star", category: "festival", greeting: "Eid ul Adha Mubarak", slug: "fest-eid-adha-star", name: "Golden Star Pattern", tagline: "Turning golden Islamic geometry", emoji: "⭐", accent: "#f5c542" },
  { id: "independence-day", category: "festival", greeting: "Happy Independence Day", slug: "fest-independence-day", name: "Green and White", tagline: "Bunting, confetti and a crescent star", emoji: "💚", accent: "#1fae5b" },
  { id: "diwali-diyas", category: "festival", greeting: "Happy Diwali", slug: "fest-diwali-diyas", name: "Diwali Diyas", tagline: "Flickering diyas and rising sparks", emoji: "🪔", accent: "#ff9f1c" },
  { id: "new-year-fireworks", category: "festival", greeting: "Happy New Year", slug: "fest-new-year-fireworks", name: "New Year Fireworks", tagline: "Fireworks bursting over the city", emoji: "🎆", accent: "#4cc9f0" },
  { id: "christmas-snow", category: "festival", greeting: "Merry Christmas", slug: "fest-christmas-snow", name: "Christmas Snow", tagline: "A lit tree in falling snow", emoji: "🎄", accent: "#2fbf5b" },
  { id: "holi-colours", category: "festival", greeting: "Happy Holi", slug: "fest-holi-colours", name: "Holi Colours", tagline: "Splashes of bright powder", emoji: "🎨", accent: "#ff2d95" },
  { id: "basant-kites", category: "festival", greeting: "Happy Basant", slug: "fest-basant-kites", name: "Basant Kites", tagline: "Colourful kites in a blue sky", emoji: "🪁", accent: "#ffd23f" },
  { id: "halloween-night", category: "festival", greeting: "Happy Halloween", slug: "fest-halloween-night", name: "Halloween Night", tagline: "Bats, a big moon and glowing pumpkins", emoji: "🎃", accent: "#ff9f1c" },
  { id: "lunar-new-year", category: "festival", greeting: "Happy Lunar New Year", slug: "fest-lunar-new-year", name: "Lunar New Year", tagline: "Golden rings and falling coins", emoji: "🧧", accent: "#fcd34d" },
  { id: "autumn-thanks", category: "festival", greeting: "Happy Thanksgiving", slug: "fest-autumn-thanks", name: "Autumn Leaves", tagline: "Warm leaves drifting down", emoji: "🍂", accent: "#f59e0b" },
  { id: "easter-eggs", category: "festival", greeting: "Happy Easter", slug: "fest-easter-eggs", name: "Easter Eggs", tagline: "Bouncing pastel eggs", emoji: "🥚", accent: "#ff8fab" },
  { id: "jumma-aurora", category: "festival", greeting: "Jumma Mubarak", slug: "fest-jumma-aurora", name: "Jumma Aurora", tagline: "Soft aurora and drifting fireflies", emoji: "✨", accent: "#22d3ee" },
  { id: "congrats-trophy", category: "congratulations", greeting: "Congratulations", slug: "cong-trophy", name: "Golden Trophy", tagline: "A shining trophy with sparkles", emoji: "🏆", accent: "#f5c542" },
  {
    id: "congrats-crown-reveal",
    category: "congratulations",
    greeting: "Congratulations",
    slug: "cong-crown",
    name: "Royal Crown",
    tagline: "A royal crown reveal with glowing golden details",
    emoji: "👑",
    accent: "#ffdc70",
  },
  {
    id: "congrats-finish-line",
    category: "congratulations",
    greeting: "Congratulations",
    slug: "cong-finish-line",
    name: "Victory Finish Line",
    tagline: "A runner crossing the finish line in victory",
    emoji: "🏁",
    accent: "#00cfff",
  },
  {
    id: "congrats-puzzle-solved",
    category: "congratulations",
    greeting: "Congratulations",
    slug: "cong-puzzle",
    name: "Puzzle Complete",
    tagline: "A glowing puzzle coming together to celebrate success",
    emoji: "🧩",
    accent: "#22d3ee",
  },
  {
    id: "congrats-curtain-spotlight",
    category: "congratulations",
    greeting: "Congratulations",
    slug: "cong-spotlight",
    name: "Grand Spotlight",
    tagline: "Elegant stage curtains opening for a special moment",
    emoji: "🎭",
    accent: "#ffd28a",
  },
  {
    id: "congrats-bullseye",
    category: "congratulations",
    greeting: "Congratulations",
    slug: "cong-bullseye",
    name: "Perfect Target",
    tagline: "A target hit animation celebrating a perfect achievement",
    emoji: "🎯",
    accent: "#38bdf8",
  },
  {
    id: "congrats-firework-burst",
    category: "congratulations",
    greeting: "Congratulations",
    slug: "cong-firework-burst",
    name: "Colourful Firework Burst",
    tagline: "Bright colourful fireworks light up the sky",
    emoji: "🎆",
    accent: "#a855f7",
  },
  {
    id: "congrats-golden-fireworks",
    category: "congratulations",
    greeting: "Congratulations",
    slug: "cong-golden-fireworks",
    name: "Golden Fireworks",
    tagline: "A luxurious golden fireworks celebration",
    emoji: "✨",
    accent: "#ffd166",
  },
  {
    id: "congrats-firework-rockets",
    category: "congratulations",
    greeting: "Congratulations",
    slug: "cong-firework-rockets",
    name: "Rocket Fireworks",
    tagline: "Rockets launch into the sky with colourful explosions",
    emoji: "🚀",
    accent: "#38bdf8",
  },
  {
    id: "congrats-celebration-night",
    category: "congratulations",
    greeting: "Congratulations",
    slug: "cong-celebration-night",
    name: "Celebration Night",
    tagline: "A spectacular night sky filled with fireworks",
    emoji: "🌌",
    accent: "#8b5cf6",
  },
  {
    id: "congrats-confetti-fireworks",
    category: "congratulations",
    greeting: "Congratulations",
    slug: "cong-confetti-fireworks",
    name: "Confetti Fireworks",
    tagline: "Colourful fireworks with a shower of confetti",
    emoji: "🎊",
    accent: "#ec4899",
  },
  {
    id: "wedding-royal",
    category: "wedding",
    greeting: "Congratulations on Your Wedding",
    slug: "wedding-royal",
    name: "Royal Wedding",
    tagline: "A luxurious royal wedding invitation with an elegant celebration",
    emoji: "👑",
    accent: "#d4af37",
  },
  {
    id: "wedding-rose-petals",
    category: "wedding",
    greeting: "Happy Wedding",
    slug: "wedding-rose-petals",
    name: "Rose Petal Shower",
    tagline: "Romantic rose petals falling gracefully around the couple",
    emoji: "🌹",
    accent: "#e11d48",
  },
  {
    id: "wedding-royal",
    category: "wedding",
    greeting: "A Royal Beginning to Forever",
    slug: "wedding-royal",
    name: "Royal Mandap",
    tagline: "A luxurious royal wedding celebration with elegant maroon and golden accents",
    emoji: "👑",
    accent: "#D4AF67",
  },
  {
    id: "wedding-rose-petals",
    category: "wedding",
    greeting: "May Your Love Bloom Forever",
    slug: "wedding-rose-petals",
    name: "Rose Petals",
    tagline: "Romantic blush roses and delicate petals celebrating a beautiful love story",
    emoji: "🌹",
    accent: "#E9AAB9",
  },
  {
    id: "wedding-midnight-lights",
    category: "wedding",
    greeting: "A Lifetime Under the Stars",
    slug: "wedding-midnight-lights",
    name: "Midnight Lights",
    tagline: "A magical midnight celebration illuminated by warm golden lights",
    emoji: "✨",
    accent: "#F5C66B",
  },
  {
    id: "wedding-botanical-heart",
    category: "wedding",
    greeting: "Two Hearts, One Beautiful Journey",
    slug: "wedding-botanical-heart",
    name: "Botanical Heart",
    tagline: "Fresh botanical greenery and delicate heart details for nature-loving couples",
    emoji: "💚",
    accent: "#477C61",
  },
  {
    id: "wedding-emerald-palace",
    category: "wedding",
    greeting: "A Love Worth Celebrating",
    slug: "wedding-emerald-palace",
    name: "Emerald Palace",
    tagline: "An elegant emerald and gold palace-inspired wedding celebration",
    emoji: "💎",
    accent: "#C6A24E",
  },
  {
    id: "wedding-ivory-roses",
    category: "wedding",
    greeting: "Forever Begins Today",
    slug: "wedding-ivory-roses",
    name: "Ivory Roses",
    tagline: "Timeless ivory elegance with delicate floral details and vintage charm",
    emoji: "🤍",
    accent: "#C59A70",
  },
  {
    id: "wedding-black-marble",
    category: "wedding",
    greeting: "A Love Beyond Luxury",
    slug: "wedding-black-marble",
    name: "Black Marble",
    tagline: "A sophisticated black marble design with luxurious golden detailing",
    emoji: "🖤",
    accent: "#D4B05C",
  },
  {
    id: "wedding-sunset-beach",
    category: "wedding",
    greeting: "Together Until the Sunset",
    slug: "wedding-sunset-beach",
    name: "Sunset Beach",
    tagline: "A dreamy beachside wedding inspired by golden sunsets and endless horizons",
    emoji: "🌅",
    accent: "#E7A46F",
  },
  {
    id: "wedding-plum-floral",
    category: "wedding",
    greeting: "Our Forever Love Story",
    slug: "wedding-plum-floral",
    name: "Plum Floral",
    tagline: "Rich plum shades and beautiful floral accents for a romantic celebration",
    emoji: "🌺",
    accent: "#C77A9B",
  },
  {
    id: "wedding-blue-watercolor",
    category: "wedding",
    greeting: "A Beautiful Love Takes Flight",
    slug: "wedding-blue-watercolor",
    name: "Blue Watercolor",
    tagline: "Soft blue watercolor textures and graceful butterflies for a dreamy wedding",
    emoji: "🦋",
    accent: "#8DBBD5",
  },
  {
    id: "wedding-moonlit-lake",
    category: "wedding",
    greeting: "Together Under the Moonlight",
    slug: "wedding-moonlit-lake",
    name: "Moonlit Lake",
    tagline: "A peaceful moonlit landscape reflecting the beauty of everlasting love",
    emoji: "🌙",
    accent: "#C4E4ED",
  },
  {
    id: "wedding-lace-medallion",
    category: "wedding",
    greeting: "A Timeless Union of Hearts",
    slug: "wedding-lace-medallion",
    name: "Lace Medallion",
    tagline: "Intricate lace-inspired patterns and vintage medallion elegance",
    emoji: "🌼",
    accent: "#B58C59",
  },
  {
    id: "wedding-pastel-watercolor",
    category: "wedding",
    greeting: "Love Makes Everything Beautiful",
    slug: "wedding-pastel-watercolor",
    name: "Pastel Watercolor",
    tagline: "Dreamy pastel washes and soft romantic colors for a modern wedding greeting",
    emoji: "💕",
    accent: "#D8AFCB",
  },
  {
    id: "wedding-celestial-lantern",
    category: "wedding",
    greeting: "May Your Love ShineForever",
    slug: "wedding-celestial-lantern",
    name: "Celestial Lantern",
    tagline: "Glowing lanterns, celestial stars and magical midnight wedding elegance",
    emoji: "🏮",
    accent: "#E6C36D",
  },
  {
    id: "wedding-modern-botanical",
    category: "wedding",
    greeting: "Congratulations on Your Wedding Day!",
    slug: "wedding-modern-botanical",
    name: "Modern Botanical",
    tagline: "Fresh mint tones, elegant floral arrangements and graceful botanical borders",
    emoji: "🌿",
    accent: "#9EC9BA",
  },
];

export const templatesIn = (categoryId: string) => PERSONAL_TEMPLATES.filter((t) => t.category === categoryId);

export const PERSONAL_BY_SLUG: Record<string, PersonalTemplate> = Object.fromEntries(PERSONAL_TEMPLATES.map((t) => [t.slug, t]));
export const getPersonalTemplate = (idOrSlug: string): PersonalTemplate | null =>
  PERSONAL_BY_SLUG[idOrSlug] ?? PERSONAL_TEMPLATES.find((t) => t.id === idOrSlug) ?? null;

export const PERSONAL_PRICE_USD = 0.29; // shown as rupees (see features/payments/pricing.ts)
export const PERSONAL_SECONDS = 4;
export const NAME_MAX = 20;

/**
 * The only customer input. Letters (any language), spaces, apostrophe, hyphen and dot; 1 to 20 characters.
 * Everything else (digits, symbols, emoji, markup) is removed, so the text can never inject anything.
 */
export function normalizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\s'’.\-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
}

export const isValidName = (name: string) => /\p{L}/u.test(name) && name.length >= 1 && name.length <= NAME_MAX;
