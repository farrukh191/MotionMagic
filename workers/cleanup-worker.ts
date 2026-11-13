import { runCleanup } from "@/features/generation/cleanup";

const INTERVAL_MS = 10 * 60 * 1000;

async function tick() {
  try {
    const r = await runCleanup();
    console.log(`[cleanup] expired=${r.expired} recovered=${r.recovered} paymentsSettled=${r.paymentsSettled}`);
  } catch (e) {
    console.error("[cleanup] error", e);
  }
}

// Pass --once to run a single pass (useful for cron).
if (process.argv.includes("--once")) {
  tick().then(() => process.exit(0));
} else {
  tick();
  setInterval(tick, INTERVAL_MS);
}
