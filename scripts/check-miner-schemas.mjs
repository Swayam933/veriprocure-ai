const BASE = "https://devnode.telegraphprotocol.com";

const intents = [
  "CODE_GENERATION_GENERAL",
  "QUESTION_ANSWERING_GENERAL",
  "LLM_OUTPUT_EVALUATION_GENERAL"
];

for (const intent of intents) {
  console.log(`\n=================== ${intent} ===================`);
  const res = await fetch(`${BASE}/api/miners?intent=${intent}`);
  const miners = await res.json();
  for (const m of miners.slice(0, 3)) {
    console.log(`Miner #${m.id} (${m.name}):`);
    console.log(`  Endpoints:`, JSON.stringify(m.endpoints));
    console.log(`  Input schema:`, JSON.stringify(m.input_schema));
  }
}

