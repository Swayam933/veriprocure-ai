const BASE = "https://devnode.telegraphprotocol.com";

const intents = [
  "CODE_GENERATION_GENERAL",
  "QUESTION_ANSWERING_GENERAL",
  "LLM_OUTPUT_EVALUATION_GENERAL"
];

for (const intent of intents) {
  console.log(`\n=================== ${intent} ===================`);
  const res = await fetch(`${BASE}/engine/v1/intents/${intent}/miners`);
  if (!res.ok) {
    console.log("Failed to fetch miners:", res.status, await res.text());
    continue;
  }
  const data = await res.json();
  console.log(`Found ${data.count} miners.`);
  for (const m of (data.miners || []).slice(0, 5)) {
    console.log(`- Miner #${m.id} (${m.name}, slug: ${m.slug})`);
    console.log(`  Description: ${m.description?.slice(0, 100)}...`);
  }
}

