import "dotenv/config";
import { processPendingVerifications } from "./server/verificationWorker";

async function run() {
  console.log("Starting manual verification processing...");
  await processPendingVerifications();
  console.log("Finished manual verification processing.");
  process.exit(0);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
