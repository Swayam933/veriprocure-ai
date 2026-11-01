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

const BASE = (process.env.TELEGRAPH_BASE_URL || "https://devnode.telegraphprotocol.com").replace(/\/$/, "");

console.log("Testing Telegraph devnode base:", BASE);

// 1. Check intents
try {
  const res = await fetch(`${BASE}/engine/v1/intents`);
  console.log("Intents status:", res.status);
  const data = await res.json();
  console.log("Intents found:", Array.isArray(data) ? data.length : Object.keys(data));
} catch (e) {
  console.error("Intents error:", e.message);
}

// 2. Check a raw POST to ask without payment to inspect 402 response headers
try {
  const askRes = await fetch(`${BASE}/engine/v1/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "Hello" })
  });
  console.log("Ask status:", askRes.status);
  const askBody = await askRes.text();
  console.log("Ask body:", askBody);
  console.log("Response headers:");
  for (const [k, v] of askRes.headers.entries()) {
    console.log(`  ${k}: ${v.length > 100 ? v.slice(0, 100) + '...' : v}`);
  }
} catch (e) {
  console.error("Ask raw error:", e.message);
}
