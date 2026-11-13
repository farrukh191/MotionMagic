export type MotionResult = {
  video: Buffer; // MP4
  provider: string;
  model: string;
  costUsd: number; // estimated; reconcile against provider billing
};

export interface MotionProvider {
  imageToMotion(image: Buffer, prompt: string, seconds: number): Promise<MotionResult>;
}

export type AiStep = "design" | "eyes" | "image-edit" | "image-to-motion";
export type EditKind = "smile" | "superhero" | "dreamy" | "cartoon";

/** One AI call, ready to be written to ai_usage_logs. */
export type Usage = {
  provider: string;
  model: string;
  step: AiStep;
  inputTokens: number;
  outputTokens: number;
  images: number;
  costUsd: number; // actually billed (0 on free-tier keys)
  notionalCostUsd: number; // what the same call costs on paid pricing
};

/** Normalized (0..1) eye positions measured from the top-left of the image. */
export type Eyes = { left: { x: number; y: number }; right: { x: number; y: number }; width: number };

/** Receives EVERY attempt, successful or not, so quotas and cost records are always complete. */
export type AiCtx = { log: (usage: Usage, success: boolean) => Promise<void> };

/** An error whose message is safe to show to customers. */
export class AiUserError extends Error {
  constructor(message: string, public status = 503) {
    super(message);
  }
}

export interface AiToolbox {
  designAnimation(prompt: string, ctx: AiCtx): Promise<{ html: string; title: string }>;
  detectEyes(image: Buffer, ctx: AiCtx): Promise<Eyes>;
  editImage(image: Buffer, kind: EditKind, ctx: AiCtx): Promise<{ image: Buffer }>;
}
