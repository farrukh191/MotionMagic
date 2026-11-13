import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorage } from "@/services/storage";
import { FINAL_SPEC } from "@/features/effects/render";
import { capturePayment } from "@/features/payments/service";
import { renderPersonalGif } from "@/features/personalized/render";
import { getPersonalTemplate } from "@/features/personalized/meta";
import { parseName } from "@/features/personalized/service";

export class DeliverError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * Returns the GIF bytes for a paid generation.
 * Personalized GIFs are never stored: the file is drawn right now, from the template and the name, and handed over.
 * Other kinds are read from storage as before.
 */
export async function deliverGif(generationId: string, viewerUserId: string | null = null): Promise<{ data: Buffer; id: string }> {
  const gen = await db.generation.findUnique({ where: { id: generationId } });
  const paid = gen && (gen.paymentStatus === "AUTHORIZED" || gen.paymentStatus === "CAPTURED");
  // Free mode: a personalized GIF that was unlocked without payment is only deliverable while the switch is off.
  const free = gen?.kind === "personal" && !env.paymentRequired && gen.paymentStatus === "NONE";
  if (!gen || !(paid || free) || gen.status !== "COMPLETED") throw new DeliverError("Not available.", 404);

  if (gen.kind === "personal") {
    if (env.requireLogin && (!viewerUserId || gen.userId !== viewerUserId)) throw new DeliverError("Please sign in to download your GIF.", 401);
    const t = getPersonalTemplate(gen.effect);
    if (!t) throw new DeliverError("Not available.", 404);
    let data: Buffer;
    try {
      const name = parseName((gen.options as { name?: unknown } | null)?.name);
      data = (await renderPersonalGif(t.id, name, { ...FINAL_SPEC, seconds: 4 })).gif;
    } catch (e) {
      console.error(`[deliver] render failed for ${gen.id}`, e instanceof Error ? e.message : e);
      // Payment stays AUTHORIZED (not captured): the customer can simply press Download again.
      throw new DeliverError("We could not create your GIF just now. You have not lost anything, please try Download again.", 500);
    }
    await capturePayment(gen.id);
    return { data, id: gen.id };
  }

  if (!gen.outputKey) throw new DeliverError("Not available.", 404);
  return { data: await getStorage().get(gen.outputKey), id: gen.id };
}
