import { readFileSync } from "node:fs";

const BASE = "https://devnode.telegraphprotocol.com";

// 1. Get intents list from /engine/v1/intents
const intentsRes = await fetch(`${BASE}/engine/v1/intents`);
const intentsData = await intentsRes.json();
console.log("Intents from /engine/v1/intents:", JSON.stringify(intentsData).slice(0, 1000));

// 2. Collect all supported_intents from /api/miners
const minersRes = await fetch(`${BASE}/api/miners?limit=100`);
const miners = await minersRes.json();
const intentMap = {};
for (const m of miners) {
  for (const intent of (m.supported_intents || [])) {
    if (!intentMap[intent]) intentMap[intent] = [];
    intentMap[intent].push({ id: m.id, name: m.name, slug: m.slug, active: m.activation_status });
  }
}

console.log("\nAll Intent Names supported by active Miners:");
const sortedIntents = Object.keys(intentMap).sort();
for (const intent of sortedIntents) {
  console.log(`- ${intent}: ${intentMap[intent].length} miners`);
}

