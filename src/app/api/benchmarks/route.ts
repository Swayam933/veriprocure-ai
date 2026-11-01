import { NextResponse } from "next/server";
import { BENCHMARK_TASKS } from "@/lib/benchmark";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    tasks: BENCHMARK_TASKS.map((b) => ({
      id: b.id,
      name: b.name,
      difficulty: b.difficulty,
      category: b.category,
      prompt: b.prompt,
      entryFunctionName: b.entryFunctionName
    }))
  });
}

