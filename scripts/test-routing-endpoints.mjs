const BASE = "https://devnode.telegraphprotocol.com";

const endpointsToTest = [
  { url: `${BASE}/engine/v1/ask/7441`, method: "POST", body: { query: "test" } },
  { url: `${BASE}/engine/v1/intents/CODE_GENERATION_GENERAL/ask`, method: "POST", body: { query: "test" } },
  { url: `${BASE}/engine/v1/intents/CODE_GENERATION_GENERAL/miners`, method: "GET" },
  { url: `${BASE}/engine/v1/miner/7441/ask`, method: "POST", body: { query: "test" } },
  { url: `${BASE}/api/miners?intent=CODE_GENERATION_GENERAL`, method: "GET" }
];

for (const ep of endpointsToTest) {
  try {
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: { "Content-Type": "application/json" },
      body: ep.body ? JSON.stringify(ep.body) : undefined
    });
    console.log(`${ep.method} ${ep.url} -> ${res.status}`);
    const text = await res.text();
    console.log(`   ${text.slice(0, 150)}`);
  } catch (e) {
    console.log(`${ep.method} ${ep.url} -> ERROR: ${e.message}`);
  }
}

