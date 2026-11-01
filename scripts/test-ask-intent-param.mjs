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

const BASE = "https://devnode.telegraphprotocol.com";

// Test passing intent in POST body without paying first to see what the challenge / router returns
const testBodies = [
  { query: "Write a function to add two numbers", intent: "CODE_GENERATION_GENERAL" },
  { query: "Write a function to add two numbers in typescript", intent_id: "CODE_GENERATION_GENERAL" }
];

for (const b of testBodies) {
  console.log("Testing body:", JSON.stringify(b));
  const res = await fetch(`${BASE}/engine/v1/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b)
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text.slice(0, 300));
}

