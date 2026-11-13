import { env } from "@/lib/env";
import { AiHttpError, parseJsonLoose, postJson } from "./http";
import { makeUsage } from "./cost";
import { DESIGN_SYSTEM_PROMPT, EDIT_PROMPTS, EYES_PROMPT, designUserPrompt } from "./prompts";
import type { AiCtx, EditKind, Eyes } from "./types";

const base = "https://generativelanguage.googleapis.com/v1beta/models";
const headers = () => ({ "x-goog-api-key": env.geminiKey }); // header, not ?key=, so URLs in logs stay clean

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType: string; data: string } }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  promptFeedback?: { blockReason?: string };
};

const textOf = (r: GeminiResponse) => r.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

export async function geminiDesign(prompt: string, ctx: AiCtx) {
  const model = env.geminiTextModel;
  let r: GeminiResponse;
  try {
    r = (await postJson(`${base}/${model}:generateContent`, headers(), {
      systemInstruction: { parts: [{ text: DESIGN_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: designUserPrompt(prompt) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.9, maxOutputTokens: 6000 },
    })) as GeminiResponse;
  } catch (e) {
    await ctx.log(makeUsage("gemini", model, "design"), false);
    throw e;
  }
  const usage = makeUsage("gemini", model, "design", r.usageMetadata?.promptTokenCount, r.usageMetadata?.candidatesTokenCount);
  try {
    const j = parseJsonLoose(textOf(r));
    if (typeof j.html !== "string") throw new Error("no html in response");
    await ctx.log(usage, true);
    return { html: j.html, title: typeof j.title === "string" ? j.title : "Custom animation" };
  } catch (e) {
    await ctx.log(usage, false); // tokens were still spent
    throw e;
  }
}

export async function geminiEyes(image: Buffer, ctx: AiCtx): Promise<Record<string, unknown>> {
  const model = env.geminiTextModel;
  try {
    const r = (await postJson(`${base}/${model}:generateContent`, headers(), {
      contents: [{ role: "user", parts: [{ text: EYES_PROMPT }, { inlineData: { mimeType: "image/png", data: image.toString("base64") } }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 400 },
    })) as GeminiResponse;
    await ctx.log(makeUsage("gemini", model, "eyes", r.usageMetadata?.promptTokenCount, r.usageMetadata?.candidatesTokenCount), true);
    return parseJsonLoose(textOf(r));
  } catch (e) {
    await ctx.log(makeUsage("gemini", model, "eyes"), false);
    throw e;
  }
}

export async function geminiEdit(image: Buffer, kind: EditKind, ctx: AiCtx): Promise<Buffer> {
  const model = env.geminiImageModel;
  try {
    const r = (await postJson(
      `${base}/${model}:generateContent`,
      headers(),
      {
        contents: [{ role: "user", parts: [{ text: EDIT_PROMPTS[kind] }, { inlineData: { mimeType: "image/png", data: image.toString("base64") } }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      },
      90_000,
    )) as GeminiResponse;
    const part = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData) {
      await ctx.log(makeUsage("gemini", model, "image-edit", r.usageMetadata?.promptTokenCount, r.usageMetadata?.candidatesTokenCount, 0), false);
      throw new Error(r.promptFeedback?.blockReason ? `blocked: ${r.promptFeedback.blockReason}` : "model returned no image");
    }
    await ctx.log(makeUsage("gemini", model, "image-edit", r.usageMetadata?.promptTokenCount, r.usageMetadata?.candidatesTokenCount, 1), true);
    return Buffer.from(part.inlineData.data, "base64");
  } catch (e) {
    if (e instanceof AiHttpError) await ctx.log(makeUsage("gemini", model, "image-edit"), false);
    throw e;
  }
}

export type { Eyes };
