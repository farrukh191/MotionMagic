import { env } from "@/lib/env";
import type { MotionProvider } from "./types";

/**
 * fal.ai queue API (REST). Verify the model ids, input schemas and per-call prices in
 * your fal dashboard before going live: models and prices change.
 */
const ESTIMATED_COST_USD = 0.3; // conservative estimate per 5s clip; reconcile with billing

async function falFetch(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${env.falKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`fal.ai ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** Submits a job, polls until finished, returns the result JSON. */
async function runFalJob(model: string, input: Record<string, unknown>, timeoutMs: number) {
  if (!env.falKey) throw new Error("FAL_KEY is not set");
  const submit = await falFetch(`https://queue.fal.run/${model}`, { method: "POST", body: JSON.stringify(input) });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    const status = await falFetch(submit.status_url);
    if (status.status === "COMPLETED") return falFetch(submit.response_url);
    if (status.status === "FAILED") throw new Error("fal.ai generation failed");
  }
  throw new Error("fal.ai generation timed out");
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not download generated file");
  return Buffer.from(await res.arrayBuffer());
}

const dataUrl = (image: Buffer) => `data:image/png;base64,${image.toString("base64")}`;

export const falProvider: MotionProvider = {
  async imageToMotion(image, prompt, seconds) {
    const model = env.falMotionModel;
    const result = await runFalJob(
      model,
      {
        prompt: prompt || "subtle natural motion, cinematic, high quality",
        image_url: dataUrl(image),
        duration: String(seconds),
      },
      5 * 60 * 1000,
    );
    const videoUrl: string | undefined = result?.video?.url;
    if (!videoUrl) throw new Error("fal.ai returned no video");
    return { video: await download(videoUrl), provider: "fal.ai", model, costUsd: ESTIMATED_COST_USD };
  },
};
