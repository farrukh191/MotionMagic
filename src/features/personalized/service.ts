import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { CreateError, assertUnderDailyLimit } from "@/features/generation/create";
import { PERSONAL_PRICE_USD, getPersonalTemplate, isValidName, normalizeName, type PersonalTemplate } from "./meta";

export function parseName(raw: unknown): string {
  const name = normalizeName(raw);
  if (!isValidName(name)) throw new CreateError("Please type a name using letters only (up to 20 characters).");
  return name;
}

/** Creates a DRAFT personalized generation. No upload and no AI: just a template and a name. */
export async function createPersonalDraft(args: { guestSessionId: string; userId?: string | null; template: PersonalTemplate; rawName: unknown }) {
  const name = parseName(args.rawName);
  await assertUnderDailyLimit(args.guestSessionId);
  const gen = await db.generation.create({
    data: {
      guestSessionId: args.guestSessionId,
      userId: args.userId ?? null,
      effect: args.template.slug,
      kind: "personal",
      width: 480,
      height: 480,
      options: { name },
      priceUsd: PERSONAL_PRICE_USD,
      originalKey: "none", // personalized GIFs have no photo and nothing is ever stored for them,
      expiresAt: new Date(Date.now() + env.retentionHours * 60 * 60 * 1000),
    },
  });
  return { id: gen.id, template: args.template.id, price: PERSONAL_PRICE_USD, name };
}

/** Change Name (and optionally switch template) on an unpaid draft. Keeps the preview counter. */
export async function updatePersonalDraft(generationId: string, guestSessionId: string, patch: { name?: unknown; template?: string }) {
  const gen = await db.generation.findUnique({ where: { id: generationId } });
  if (!gen || gen.guestSessionId !== guestSessionId || gen.kind !== "personal") throw new CreateError("Not found", 404);
  if (gen.status !== "DRAFT") throw new CreateError("This GIF can no longer be changed.", 409);
  const previous = (gen.options ?? {}) as Record<string, unknown>;
  const name = patch.name === undefined ? parseName(previous.name) : parseName(patch.name);
  const template = patch.template ? getPersonalTemplate(patch.template) : getPersonalTemplate(gen.effect);
  if (!template) throw new CreateError("Unknown template.");
  await db.generation.update({ where: { id: gen.id }, data: { effect: template.slug, options: { ...previous, name } } });
  return { template: template.id, name };
}
