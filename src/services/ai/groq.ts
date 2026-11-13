import { env } from "@/lib/env";
import { parseJsonLoose, postJson } from "./http";
import { makeUsage } from "./cost";
import { DESIGN_SYSTEM_PROMPT, EYES_PROMPT, designUserPrompt } from "./prompts";
import type { AiCtx } from "./types";

type ChatResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

const url = () => `${env.groqBaseUrl}/chat/completions`;
const headers = () => ({ Authorization: `Bearer ${env.groqKey}` });

export async function groqDesign(prompt: string, ctx: AiCtx) {
  const model = env.groqTextModel;
  let r: ChatResponse;
  try {
    r = (await postJson(url(), headers(), {
      model,
      messages: [
        { role: "system", content: DESIGN_SYSTEM_PROMPT },
        { role: "user", content: designUserPrompt(prompt) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 6000,
    })) as ChatResponse;
  } catch (e) {
    await ctx.log(makeUsage("groq", model, "design"), false);
    throw e;
  }
  const usage = makeUsage("groq", model, "design", r.usage?.prompt_tokens, r.usage?.completion_tokens);
  try {
    const j = parseJsonLoose(r.choices?.[0]?.message?.content ?? "");
    if (typeof j.html !== "string") throw new Error("no html in response");
    await ctx.log(usage, true);
    return { html: j.html, title: typeof j.title === "string" ? j.title : "Custom animation" };
  } catch (e) {
    await ctx.log(usage, false); // tokens were still spent
    throw e;
  }
}

export async function groqEyes(image: Buffer, ctx: AiCtx): Promise<Record<string, unknown>> {
  const model = env.groqVisionModel;
  let r: ChatResponse;
  try {
    r = (await postJson(url(), headers(), {
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EYES_PROMPT },
            { type: "image_url", image_url: { url: `data:image/png;base64,${image.toString("base64")}` } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 400,
    })) as ChatResponse;
  } catch (e) {
    await ctx.log(makeUsage("groq", model, "eyes"), false);
    throw e;
  }
  const usage = makeUsage("groq", model, "eyes", r.usage?.prompt_tokens, r.usage?.completion_tokens);
  try {
    const j = parseJsonLoose(r.choices?.[0]?.message?.content ?? "");
    await ctx.log(usage, true);
    return j;
  } catch (e) {
    await ctx.log(usage, false);
    throw e;
  }
}
