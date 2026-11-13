import sharp from "sharp";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorage } from "@/services/storage";
import { assertUnderDailyLimit, CreateError } from "@/features/generation/create";
import { ImageValidationError, validateAndNormalizeImage } from "@/features/upload/validate-image";
import type { BizInputs } from "./build";
import { toBizImage } from "./render";
import { bizDimensions, bizPrice, normalizeBizOptions, missingForBiz, type BizOptions, type BizTemplate, type ImageSlot } from "./meta";

const SLOT_KEYS: ImageSlot["key"][] = ["product", "logo", "image1", "image2", "image3", "image4"];
export const isSlot = (k: string): k is ImageSlot["key"] => (SLOT_KEYS as string[]).includes(k);

/**
 * Logos keep their transparency and colours: we validate and shrink only. (The shared photo validator
 * flattens nothing and outputs PNG, so alpha is preserved.)
 */
async function storeSlot(guestSessionId: string, generationId: string, slot: string, file: File) {
  const image = await validateAndNormalizeImage(Buffer.from(await file.arrayBuffer()));
  const key = `business/${generationId}/${slot}.png`;
  await getStorage().put(key, image.buffer);
  await db.generatedAsset.create({ data: { generationId, kind: `input:${slot}`, storageKey: key, bytes: image.buffer.length, width: image.width, height: image.height } });
  return { key, image };
}

/** Creates a DRAFT business generation from uploaded files (form field names = slot keys) and the typed fields. */
export async function createBusinessDraft(args: { guestSessionId: string; template: BizTemplate; rawOptions: unknown; files: Partial<Record<string, File>> }) {
  const { template: t, guestSessionId } = args;
  await assertUnderDailyLimit(guestSessionId);
  const options = normalizeBizOptions(t, args.rawOptions);
  const allowed = new Set(t.images.map((s) => s.key as string));
  const slots = Object.keys(args.files).filter((k) => allowed.has(k) && args.files[k] instanceof File);
  for (const s of t.images) if (s.required && !slots.includes(s.key)) throw new CreateError(`Please add: ${s.label.split(" (")[0].toLowerCase()}.`);
  if (t.kind === "showcase" && slots.length < 2) throw new CreateError("A showcase needs at least 2 photos.");

  const dims = bizDimensions(options.size, 480);
  const gen = await db.generation.create({
    data: {
      guestSessionId,
      effect: t.slug,
      kind: "business",
      width: dims.w,
      height: dims.h,
      options: { ...options },
      priceUsd: bizPrice(t),
      originalKey: "pending",
      expiresAt: new Date(Date.now() + env.retentionHours * 60 * 60 * 1000),
    },
  });
  try {
    let first: string | null = null;
    for (const slot of slots) {
      const r = await storeSlot(guestSessionId, gen.id, slot, args.files[slot]!);
      first ??= r.key;
    }
    if (!first) {
      // Banners can be text-only: keep a tiny placeholder so every generation has an "original".
      first = `business/${gen.id}/blank.png`;
      await getStorage().put(first, await sharp({ create: { width: 64, height: 64, channels: 3, background: "#000" } }).png().toBuffer());
    }
    await db.generation.update({ where: { id: gen.id }, data: { originalKey: first } });
  } catch (e) {
    await db.generation.delete({ where: { id: gen.id } }).catch(() => null);
    if (e instanceof ImageValidationError) throw new CreateError(e.message);
    throw e;
  }
  return { id: gen.id, slug: t.slug, price: bizPrice(t), options, images: slots };
}

/** Loads the customer's images for a generation, ready to embed. */
export async function loadBizInputs(generationId: string): Promise<{ inputs: BizInputs; slots: string[] }> {
  const assets = await db.generatedAsset.findMany({ where: { generationId, kind: { startsWith: "input:" } } });
  const inputs: BizInputs = {};
  const slots: string[] = [];
  for (const a of assets) {
    const slot = a.kind.slice("input:".length);
    if (!isSlot(slot)) continue;
    inputs[slot] = await toBizImage(await getStorage().get(a.storageKey));
    slots.push(slot);
  }
  return { inputs, slots };
}

/** Throws a customer-readable message listing what is still missing (used before payment). */
export async function assertBizComplete(t: BizTemplate, generationId: string, rawOptions: unknown) {
  const { slots } = await loadBizInputs(generationId).catch(() => ({ slots: [] as string[] }));
  const missing = missingForBiz(t, normalizeBizOptions(t, rawOptions), slots);
  return missing;
}

export type { BizOptions };
