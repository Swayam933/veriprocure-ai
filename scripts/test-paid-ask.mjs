import { readFileSync } from "node:fs";

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadEnvFile(".env.local");

// Import the paidAsk from the compiled build or ts file directly
import { paidAsk } from "../src/lib/telegraph.ts";

console.log("Testing live paidAsk with query...");
try {
  const query = "For the CODE_GENERATION_GENERAL intent: return a typescript function that adds two numbers.";
  console.log("Submitting query:", query);
  const result = await paidAsk(query);
  console.log("Success! Paid result:");
  console.log("Cost USD:", result.costUsd);
  console.log("Duration:", result.durationMs, "ms");
  console.log("Miner:", result.data?.miner_name);
  console.log("Intent:", result.data?.intent);
  console.log("Signal hash:", result.data?.signal_hash);
  console.log("Verified:", result.verified);
  console.log("Receipt:", JSON.stringify(result.receipt));
  console.log("Result text:", (result.data?.result || result.data?.answer || JSON.stringify(result.data)).slice(0, 300));
} catch (e) {
  console.error("paidAsk error:", e);
}
