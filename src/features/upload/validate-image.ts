import sharp from "sharp";
import { env } from "@/lib/env";

const ALLOWED = new Set(["jpeg", "png", "webp"]);
const MAX_DIMENSION = 6000;
const MIN_DIMENSION = 64;

export type ValidatedImage = {
  buffer: Buffer; // normalized PNG, EXIF stripped, max 1024px on the long side
  width: number;
  height: number;
};

export class ImageValidationError extends Error {}

/**
 * Validates by decoding the actual bytes (never trusts the client MIME type),
 * strips metadata, auto-rotates and resizes to a safe working size.
 */
export async function validateAndNormalizeImage(input: Buffer): Promise<ValidatedImage> {
  if (input.length === 0) throw new ImageValidationError("The file is empty.");
  if (input.length > env.maxUploadBytes) {
    throw new ImageValidationError(
      `File is too large. Maximum is ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB.`,
    );
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_DIMENSION * MAX_DIMENSION }).metadata();
  } catch {
    throw new ImageValidationError("This file is not a valid image.");
  }

  if (!meta.format || !ALLOWED.has(meta.format)) {
    throw new ImageValidationError("Only JPG, PNG and WebP images are supported.");
  }
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < MIN_DIMENSION || h < MIN_DIMENSION) {
    throw new ImageValidationError("Image is too small. Minimum is 64×64 pixels.");
  }
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    throw new ImageValidationError("Image dimensions are too large.");
  }

  const { data, info } = await sharp(input)
    .rotate() // apply EXIF orientation, then metadata is dropped on output
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height };
}
