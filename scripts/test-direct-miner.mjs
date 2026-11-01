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

import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { privateKeyToAccount } from "viem/accounts";

const BASE = "https://devnode.telegraphprotocol.com";
const SEPOLIA_NETWORK = "eip155:11155111";

const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
const client = new x402Client();
client.register(SEPOLIA_NETWORK, new ExactEvmScheme(account));
client.setSpendControls(false);

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

console.log("Testing POST /engine/v1/ask/7441 (AssistWire LLM Eval)...");
const res = await fetchWithPayment(`${BASE}/engine/v1/ask/7441`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "Evaluate whether this email validator function handles invalid inputs: function isValid(email) { return email.includes('@'); }"
  })
});

console.log("Status:", res.status);
const data = await res.json();
console.log("Response:", JSON.stringify(data, null, 2));
