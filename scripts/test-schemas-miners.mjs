const BASE = "https://devnode.telegraphprotocol.com";

for (const name of [
  "CODE_GENERATION", "CODE_GENERATION_GENERAL",
  "QUESTION_ANSWERING", "QUESTION_ANSWERING_GENERAL",
  "LLM_OUTPUT_EVALUATION", "LLM_OUTPUT_EVALUATION_GENERAL"
]) {
  const sRes = await fetch(`${BASE}/engine/v1/intents/${name}`);
  const mRes = await fetch(`${BASE}/api/miners?intent=${name}`);
  const sData = sRes.ok ? await sRes.json() : null;
  const mData = mRes.ok ? await mRes.json() : null;
  console.log(`Intent: ${name} -> Schema: ${sRes.status} (params: ${sData?.request?.params?.length ?? 0}), Miners: ${Array.isArray(mData) ? mData.length : 0}`);
}

