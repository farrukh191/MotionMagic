/**
 * Writes every effect and business template into the AnimationTemplate table (idempotent).
 * Run after `prisma db push`:  npm run seed
 * The code catalog stays the source of truth for rendering; this table lets you see, report on and
 * switch templates off (active=false) from the database.
 */
import { PrismaClient } from "@prisma/client";
import { BUSINESS_TEMPLATES, bizPrice } from "@/features/business/meta";
import { EFFECT_LIST } from "@/features/effects/catalog";

const db = new PrismaClient();

async function main() {
  let n = 0;
  for (const [i, e] of EFFECT_LIST.entries()) {
    const data = { name: e.name, kind: "viral", category: e.categories[0] ?? null, tagline: e.tagline, usesAi: e.usesAi, priceUsd: e.priceUsd, seconds: e.durationSeconds, sortOrder: i, config: { themes: e.themes, kindOfEngine: e.kind, style: e.style } };
    await db.animationTemplate.upsert({ where: { slug: e.slug }, create: { slug: e.slug, ...data }, update: data });
    n++;
  }
  for (const [i, t] of BUSINESS_TEMPLATES.entries()) {
    const data = { name: t.name, kind: "business", category: t.kind, tagline: t.tagline, usesAi: false, priceUsd: bizPrice(t), seconds: t.seconds, sortOrder: 100 + i, config: { fields: t.fields, images: t.images, palette: t.palette, defaultSize: t.defaultSize } };
    await db.animationTemplate.upsert({ where: { slug: t.slug }, create: { slug: t.slug, ...data }, update: data });
    n++;
  }
  console.log(`Seeded ${n} templates.`);
}
main().finally(() => db.$disconnect());
