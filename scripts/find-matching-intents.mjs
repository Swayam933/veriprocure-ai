const BASE = "https://devnode.telegraphprotocol.com";
const res = await fetch(`${BASE}/engine/v1/intents`);
const data = await res.json();
const all = data.intents || [];

console.log("Searching intents matching CODE, QUESTION, EVALUATION, GENERATION:");
const matches = all.filter(i => /code|program|question|evaluat|generat/i.test(i.intent_id) || /code|program|question|evaluat|generat/i.test(i.intent_name));

for (const m of matches) {
  console.log(`- ${m.intent_id} (miners: ${m.miner_count}): ${m.description?.slice(0, 120)}...`);
}

