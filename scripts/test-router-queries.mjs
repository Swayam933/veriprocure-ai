const BASE = "https://devnode.telegraphprotocol.com";

const testQueries = [
  "Generate code for a TypeScript email validation function with unit tests.",
  "Write an algorithm in Python to compute Fibonacci numbers.",
  "Explain what are the key requirements, edge cases and acceptance criteria for an email validator?",
  "Evaluate this generated code against the specifications: does it handle null input and valid RFC 5322 format?",
  "Judge whether the following model response is factually accurate and complete."
];

for (const q of testQueries) {
  // We send a POST to /engine/v1/ask without payment just to inspect the 402 challenge or error
  // Wait, does 402 challenge show the routed intent or does it route after payment?
  // Let's check!
  const res = await fetch(`${BASE}/engine/v1/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q })
  });
  console.log(`Query: "${q.slice(0, 40)}..." -> Status: ${res.status}`);
}

