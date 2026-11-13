import type { EffectDef, Resolved } from "@/features/effects/catalog";
import type { Eyes, RenderExtras } from "@/features/effects/render";
import { mockCartoonize as localCartoonize } from "@/services/ai/mock-toolbox";
import type { AiCtx, AiToolbox } from "@/services/ai/types";

/** Where AI results are remembered, so a preview and the paid render never pay for the same AI call twice. */
export interface ExtrasStore {
  getEdited(kind: string): Promise<Buffer | null>;
  putEdited(kind: string, image: Buffer): Promise<void>;
  getEyes(): Promise<Eyes | null>;
  putEyes(eyes: Eyes): Promise<void>;
}

/** Thrown (preview only) when AI would have to run but the customer has not asked for it yet. */
export class NeedsAiError extends Error {}

export type Gathered = { image: Buffer; extras: RenderExtras; aiCalls: number };

/**
 * Runs the AI step an effect needs (image edit or eye finding), or reuses the remembered result.
 * - Cartoon Bounce animates the edited image itself, so it comes back as `image`.
 * - Other edit effects get the edited photo as `extras.edited`.
 * - In basic mode (no AI edit available) Cartoon uses a free local filter; Dreamy Clouds simply has no edit.
 */
export async function gatherExtras(args: {
  effect: EffectDef;
  resolved: Resolved;
  original: Buffer;
  store: ExtrasStore;
  toolbox: AiToolbox;
  ctx: AiCtx;
  allowAi: boolean;
}): Promise<Gathered> {
  const { effect, resolved, original, store, toolbox, ctx, allowAi } = args;
  let image = original;
  const extras: RenderExtras = {};
  let aiCalls = 0;

  if (effect.ai === "edit" && effect.editKind) {
    const kind = effect.editKind;
    let edited = await store.getEdited(kind);
    if (!edited) {
      if (resolved.useAiEdit) {
        if (!allowAi) throw new NeedsAiError();
        edited = (await toolbox.editImage(original, kind, ctx)).image;
        aiCalls++;
        await store.putEdited(kind, edited);
      } else if (kind === "cartoon") {
        edited = await localCartoonize(original);
      }
    }
    if (edited) {
      if (kind === "cartoon") image = edited;
      else extras.edited = edited;
    }
  }

  if (effect.ai === "eyes") {
    let eyes = await store.getEyes();
    if (!eyes) {
      if (!allowAi) throw new NeedsAiError();
      eyes = await toolbox.detectEyes(original, ctx);
      aiCalls++;
      await store.putEyes(eyes);
    }
    extras.eyes = eyes;
  }
  return { image, extras, aiCalls };
}
