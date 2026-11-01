const BASE = "https://devnode.telegraphprotocol.com";

async function checkIntentMiners(intent) {
  console.log(`\n=== Testing miners for ${intent} ===`);
  const res = await fetch(`${BASE}/api/miners?intent=${intent}`);
  const miners = await res.json();
  for (const m of miners) {
    console.log(`Miner ID: ${m.id} | Slug: ${m.slug} | Name: ${m.name} | Status: ${m.activation_status} | BaseUrl: ${m.base_url}`);
  }
}

await checkIntentMiners("CODE_GENERATION_GENERAL");
await checkIntentMiners("QUESTION_ANSWERING_GENERAL");

