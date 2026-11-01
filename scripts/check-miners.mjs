import { readFileSync } from "node:fs";

const BASE = "https://devnode.telegraphprotocol.com";

// Check all miners
const minersRes = await fetch(`${BASE}/api/miners?limit=100`);
const minersData = await minersRes.json();
console.log("Total miners:", minersData.length || minersData?.items?.length || minersData?.miners?.length);
console.log("Miners details:", JSON.stringify(minersData, null, 2));

// Check miners for CODE_GENERATION
const cgRes = await fetch(`${BASE}/api/miners?intent=CODE_GENERATION`);
console.log("CODE_GENERATION miners:", await cgRes.text());

// Check miners for QUESTION_ANSWERING
const qaRes = await fetch(`${BASE}/api/miners?intent=QUESTION_ANSWERING`);
console.log("QUESTION_ANSWERING miners:", await qaRes.text());

// Check miners for LLM_OUTPUT_EVALUATION
const evalRes = await fetch(`${BASE}/api/miners?intent=LLM_OUTPUT_EVALUATION`);
console.log("LLM_OUTPUT_EVALUATION miners:", await evalRes.text());

