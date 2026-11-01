import { NextResponse } from "next/server";
import { discoverIntent, discoverMiners } from "@/lib/telegraph";

export const dynamic = "force-dynamic";
const required = [
  { base: "CODE_GENERATION", canonical: "CODE_GENERATION_GENERAL" },
  { base: "QUESTION_ANSWERING", canonical: "QUESTION_ANSWERING_GENERAL" },
  { base: "LLM_OUTPUT_EVALUATION", canonical: "LLM_OUTPUT_EVALUATION_GENERAL" }
];

export async function GET() {
  const checks = await Promise.all(
    required.map(async ({ base, canonical }) => {
      try {
        const [schema, miners] = await Promise.all([
          discoverIntent(canonical).catch(() => discoverIntent(base)),
          discoverMiners(canonical)
        ]);
        const list = Array.isArray(miners) ? miners : (miners?.miners ?? miners?.items ?? []);
        return {
          intent: base,
          canonicalIntent: canonical,
          schemaAvailable: Boolean(schema),
          requestParams: schema?.request?.params ?? [],
          responseFields: schema?.response?.fields ?? [],
          liveMinerCount: list.length,
          miners: list.slice(0, 5).map((m: any) => ({
            id: m.id,
            name: m.name,
            slug: m.slug,
            status: m.activation_status ?? m.status ?? "active",
            min_price_usdc: m.min_price_usdc ?? 10000
          }))
        };
      } catch (e: any) {
        return {
          intent: base,
          canonicalIntent: canonical,
          schemaAvailable: false,
          liveMinerCount: 0,
          miners: [],
          error: e.message
        };
      }
    })
  );

  return NextResponse.json({
    network: "Telegraph Ethereum Sepolia testnet",
    ready: checks.every((c) => c.schemaAvailable && c.liveMinerCount > 0),
    checks
  });
}
