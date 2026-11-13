import { chromium, type Browser } from "playwright";
import { createLimiter } from "@/lib/limiter";

let browser: Promise<Browser> | null = null;

/** One shared headless Chromium for all HTML/CSS renders (launching per render costs ~1s). */
export function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = chromium
      .launch({ args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"] })
      .then((b) => {
        b.on("disconnected", () => (browser = null));
        return b;
      })
      .catch((e) => {
        browser = null;
        throw new Error(`Chromium is not available (${e.message}). Run: npx playwright install chromium`);
      });
  }
  return browser;
}

/** Only one HTML render at a time: Chromium is the heaviest thing this app runs. */
export const htmlLimiter = createLimiter(1);

export async function closeBrowser() {
  if (browser) await (await browser).close().catch(() => null);
  browser = null;
}
