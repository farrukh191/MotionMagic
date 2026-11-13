export class AiHttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** POST JSON with a timeout. Error text never includes headers, so API keys cannot leak into logs. */
export async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 60_000) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new AiHttpError(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`, res.status);
  return res.json();
}

/** Extracts a JSON object from model output that may be wrapped in markdown fences or prose. */
export function parseJsonLoose(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("model did not return JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}
