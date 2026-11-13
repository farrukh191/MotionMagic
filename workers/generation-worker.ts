import { claimNextJob, processGeneration } from "@/features/generation/process";

const POLL_MS = 2000;
let running = true;
process.on("SIGINT", () => (running = false));
process.on("SIGTERM", () => (running = false));

async function main() {
  console.log("[worker] generation worker started");
  while (running) {
    const id = await claimNextJob().catch((e) => {
      console.error("[worker] claim error", e);
      return null;
    });
    if (id) {
      console.log(`[worker] processing ${id}`);
      await processGeneration(id);
      console.log(`[worker] finished ${id}`);
    } else {
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
  console.log("[worker] stopped");
}

main().then(() => process.exit(0));
