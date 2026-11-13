function num(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v === undefined || v === "" ? fallback : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Dev falls back to fixed secrets; production refuses to start without real ones. */
function secret(name: string, devFallback: string): string {
  const v = process.env[name];
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && (!v || v === "change-me" || v.length < 32)) {
    throw new Error(`${name} must be set to a random value of at least 32 characters in production`);
  }
  return v || devFallback;
}

export const env = {
  sessionSecret: secret("SESSION_SECRET", "dev-session-secret"),
  downloadSecret: secret("DOWNLOAD_SECRET", "dev-download-secret"),
  storageDriver: process.env.STORAGE_DRIVER ?? "local",
  localStorageDir: process.env.LOCAL_STORAGE_DIR ?? "./.storage",
  aiMode: (process.env.AI_MODE ?? "mock") as "mock" | "live",
  falKey: process.env.FAL_KEY ?? "",
  falMotionModel:
    process.env.FAL_MOTION_MODEL ?? "fal-ai/kling-video/v1/standard/image-to-video",
  falEditModel: process.env.FAL_EDIT_MODEL ?? "fal-ai/flux/dev/image-to-image",
  // --- Free-tier AI keys (Gemini + Groq). Keys live ONLY in .env on the server. ---
  geminiKey: process.env.GEMINI_API_KEY ?? "",
  geminiTextModel: process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash", // set to the exact model id shown in Google AI Studio
  geminiImageModel: process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image",
  groqKey: process.env.GROQ_API_KEY ?? "",
  groqBaseUrl: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
  groqTextModel: process.env.GROQ_TEXT_MODEL ?? "llama-3.3-70b-versatile",
  groqVisionModel: process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
  // Which provider to try first for text/vision tasks, e.g. "groq,gemini"
  aiTextOrder: (process.env.AI_TEXT_ORDER ?? "groq,gemini").split(",").map((s) => s.trim()).filter(Boolean),
  // Daily request caps that protect free-tier quotas (count successful AND failed calls).
  geminiTextDailyLimit: num("GEMINI_TEXT_DAILY_LIMIT", 150),
  geminiImageDailyLimit: num("GEMINI_IMAGE_DAILY_LIMIT", 40),
  groqDailyLimit: num("GROQ_DAILY_LIMIT", 400),
  maxAiGenerationsPerGuestPerDay: num("MAX_AI_GENERATIONS_PER_GUEST_PER_DAY", 5),
  maxDesignsPerGeneration: num("MAX_DESIGNS_PER_GENERATION", 3),
  /**
   * Gemini image EDITING (smile, superhero costume, sky background) was reported as paid-tier only.
   * Keep this "false" on a free key. Set "true" only after enabling billing for the image model.
   */
  geminiImageEnabled: process.env.GEMINI_IMAGE_ENABLED === "true",
  // Free-tier keys bill $0. Notional prices are what the same calls would cost on paid plans.
  // PLACEHOLDER DEFAULTS: verify against current provider pricing before relying on them.
  geminiFreeTier: process.env.GEMINI_FREE_TIER !== "false",
  groqFreeTier: process.env.GROQ_FREE_TIER !== "false",
  price: {
    geminiTextInPerM: num("PRICE_GEMINI_TEXT_IN_PER_M", 0.3),
    geminiTextOutPerM: num("PRICE_GEMINI_TEXT_OUT_PER_M", 2.5),
    geminiImagePerImage: num("PRICE_GEMINI_IMAGE_PER_IMAGE", 0.039),
    groqTextInPerM: num("PRICE_GROQ_TEXT_IN_PER_M", 0.59),
    groqTextOutPerM: num("PRICE_GROQ_TEXT_OUT_PER_M", 0.79),
    groqVisionInPerM: num("PRICE_GROQ_VISION_IN_PER_M", 0.11),
    groqVisionOutPerM: num("PRICE_GROQ_VISION_OUT_PER_M", 0.34),
  },
  aiMonthlyBudgetUsd: num("AI_MONTHLY_BUDGET_USD", 25),
  aiKillSwitch: process.env.AI_KILL_SWITCH === "true",
  aiMaxRetries: num("AI_MAX_RETRIES", 1),
  maxGenerationsPerGuestPerDay: num("MAX_GENERATIONS_PER_GUEST_PER_DAY", 10),
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "mock",
  /** Payment switch for personalized GIFs: "false" = free, direct download (no Easypaisa). Anything else = payment required. */
  paymentRequired: process.env.PAYMENT_REQUIRED !== "false",
  /**
   * Personalized-only mode (default ON): customers can only pick a birthday template and type a name.
   * Photo uploads, business templates and free-text AI prompts are closed in the pages AND the API.
   * Set PERSONALIZED_ONLY="false" to re-open the full studio (all of that code is still here).
   */
  /** "true" (default): a customer must sign up / log in before the download. "false": guests can download. */
  requireLogin: process.env.REQUIRE_LOGIN !== "false",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  sessionDays: num("SESSION_DAYS", 30),
  /** Days a signed-in customer's GIF history is kept (only the template and name are stored, never the GIF). */
  accountRetentionDays: num("ACCOUNT_RETENTION_DAYS", 365),
  personalizedOnly: process.env.PERSONALIZED_ONLY !== "false",
  supabaseUrl: (process.env.SUPABASE_URL ?? "").replace(/\/+$/, ""),
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseBucket: process.env.SUPABASE_BUCKET ?? "motionmagic",
  /** Public address of this site (used for the gateway return link). No trailing slash. */
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  /** Minutes a payment may stay unconfirmed before we stop waiting (a late payment is still honoured). */
  paymentPendingMinutes: num("PAYMENT_PENDING_MINUTES", 45),
  /** Bearer token for /admin. Empty = admin disabled. */
  adminToken: process.env.ADMIN_TOKEN ?? "",
  /** Gateway fee as a percent of each payment, used ONLY in the admin profit report. Check your Easypaisa agreement. */
  paymentFeePercent: num("PAYMENT_FEE_PERCENT", 0),
  maxUploadBytes: num("MAX_UPLOAD_MB", 10) * 1024 * 1024,
  retentionHours: num("RETENTION_HOURS", 24),
};
