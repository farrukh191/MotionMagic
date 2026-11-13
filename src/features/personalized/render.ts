import type { EncodedGif } from "@/features/effects/render/frames";
import type { RenderSpec } from "@/features/effects/render/types";
import { renderDocumentGif } from "@/features/business/render";
import { buildPersonalDocument } from "./build";
import { PERSONAL_SECONDS } from "./meta";

/** Square GIF (WhatsApp and Instagram friendly). Preview = small + watermark; final = full size, clean. */
export async function renderPersonalGif(templateId: string, name: string, spec: RenderSpec): Promise<EncodedGif & { animations: number }> {
  const size = Math.round(spec.maxSize / 2) * 2;
  return renderDocumentGif(buildPersonalDocument(templateId, name, size), size, size, PERSONAL_SECONDS, spec);
}
