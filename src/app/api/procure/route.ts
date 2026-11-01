import { NextResponse } from "next/server";
import { z } from "zod";
import { paidAsk, resultText } from "@/lib/telegraph";
import { prisma } from "@/lib/prisma";
import { BENCHMARK_TASKS, findMatchingBenchmark, runDeterministicVerification, type ExecutionResult } from "@/lib/benchmark";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logEvent, logError } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 180;

const schema = z.object({
  task: z.string().trim().min(5).max(4000),
  benchmarkTaskId: z.string().optional()
});

const expected = {
  generation: "CODE_GENERATION",
  reference: "QUESTION_ANSWERING",
  evaluation: "LLM_OUTPUT_EVALUATION"
};

function matchesIntent(actual: unknown, wanted: string): boolean {
  if (typeof actual !== "string") return false;
  const a = actual.toUpperCase().replace(/_GENERAL$/, "");
  const w = wanted.toUpperCase().replace(/_GENERAL$/, "");
  return a === w;
}

function parseEvaluatorScore(data: any, text: string): number | null {
  const res = data?.result;
  if (res && typeof res === "object") {
    if (typeof res.score === "number" && !Number.isNaN(res.score)) {
      return res.score <= 10 ? Math.round(res.score * 10) : Math.min(100, Math.round(res.score));
    }
    if (typeof res.rating === "string") {
      const r = res.rating.toLowerCase();
      if (r === "excellent") return 95;
      if (r === "good") return 80;
      if (r === "acceptable") return 65;
      if (r === "poor") return 40;
      if (r === "fails" || r === "fail") return 20;
    }
  }

  const patterns = [
    /(?:overall\s+)?score\s*[:=]\s*(\d{1,3})(?:\s*\/\s*100)?/i,
    /(\d{1,3})\s*\/\s*100/,
    /score\s*[:=]\s*(\d(?:\.\d+)?)\s*\/\s*10/i,
    /verdict\s*[:=]\s*(pass|fail)/i
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      if (m[1].toLowerCase() === "pass") return 85;
      if (m[1].toLowerCase() === "fail") return 35;
      const n = Number(m[1]);
      if (p.source.includes("/10")) return Math.round(n * 10);
      if (n >= 0 && n <= 100) return Math.round(n);
    }
  }
  return null;
}

export async function POST(request: Request) {
  let runId: string | null = null;
  let user: Awaited<ReturnType<typeof requireUser>> | null = null;
  try {
    user = await requireUser(request);
    const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rate = checkRateLimit(`procure:${forwarded}:${user.id}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: `Rate limit exceeded. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.` }, { status: 429 });
    }

    const body = await request.json();
    const { task, benchmarkTaskId } = schema.parse(body);

    const benchmark = benchmarkTaskId
      ? BENCHMARK_TASKS.find((b) => b.id === benchmarkTaskId)
      : findMatchingBenchmark(task);

    const perRequestCeiling = Number(process.env.MAX_REQUEST_USD ?? "0.02");
    const dailyCeiling = Number(process.env.MAX_DAILY_SPEND_USD ?? "0.25");
    if (
      !Number.isFinite(perRequestCeiling) ||
      perRequestCeiling <= 0 ||
      !Number.isFinite(dailyCeiling) ||
      dailyCeiling <= 0
    ) {
      throw new Error("Payment budget configuration is invalid.");
    }

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const daily = await prisma.procurementRun.aggregate({
      where: { createdAt: { gte: dayStart } },
      _sum: { totalCost: true }
    });
    const spentToday = daily._sum.totalCost ?? 0;
    const worstCaseRun = perRequestCeiling * 3;
    if (spentToday + worstCaseRun > dailyCeiling) {
      throw new Error(
        `Daily spend guard: $${spentToday.toFixed(4)} already recorded today; a three-call run could cost up to $${worstCaseRun.toFixed(4)}, exceeding the $${dailyCeiling.toFixed(4)} daily ceiling.`
      );
    }

    // Create an audit record before the first paid call so partial runs preserve payment receipts
    const initial = await prisma.procurementRun.create({
      data: {
        userId: user.id,
        task,
        generatedText: "",
        benchmarkTaskId: benchmark?.id ?? null,
        status: "pending"
      }
    });
    runId = initial.id;

    // 1) CODE_GENERATION
    const generation = await paidAsk(
      `For the CODE_GENERATION_GENERAL intent: solve this programming task. Return implementation code, explain assumptions, include edge cases and tests. Do not claim tests were executed unless they actually were. Task: ${task}`,
      { intent: "CODE_GENERATION_GENERAL" }
    );
    const generatedText = resultText(generation.data);
    const generationIntentMatch = matchesIntent(generation.data?.intent, expected.generation);

    await prisma.procurementRun.update({
      where: { id: runId },
      data: {
        generatedText,
        generationCost: generation.costUsd,
        totalCost: generation.costUsd,
        generationMs: generation.durationMs,
        generationIntent: generation.data?.intent ?? null,
        generationMiner: generation.data?.miner_name ?? null,
        generationHash: generation.data?.signal_hash ?? null,
        generationReceipt: JSON.stringify({
          receipt: generation.receipt,
          paymentResponse: generation.paymentResponse,
          verification: generation.verification
        }),
        generationResponse: JSON.stringify(generation.data),
        generationVerified: generation.verified,
        generationIntentMatch
      }
    });

    // 2) QUESTION_ANSWERING
    const reference = await paidAsk(
      `For the QUESTION_ANSWERING_GENERAL intent: independently analyze the requirements of this task. Identify expected behavior, relevant technical facts, edge cases and a concise acceptance checklist. Do not write the implementation. Task: ${task}`,
      { intent: "QUESTION_ANSWERING_GENERAL" }
    );
    const referenceText = resultText(reference.data);
    const referenceIntentMatch = matchesIntent(reference.data?.intent, expected.reference);

    await prisma.procurementRun.update({
      where: { id: runId },
      data: {
        referenceText,
        referenceCost: reference.costUsd,
        totalCost: generation.costUsd + reference.costUsd,
        referenceMs: reference.durationMs,
        referenceIntent: reference.data?.intent ?? null,
        referenceMiner: reference.data?.miner_name ?? null,
        referenceHash: reference.data?.signal_hash ?? null,
        referenceReceipt: JSON.stringify({
          receipt: reference.receipt,
          paymentResponse: reference.paymentResponse,
          verification: reference.verification
        }),
        referenceResponse: JSON.stringify(reference.data),
        referenceVerified: reference.verified,
        referenceIntentMatch
      }
    });

    // 3) LLM_OUTPUT_EVALUATION
    const evaluation = await paidAsk(
      `For the LLM_OUTPUT_EVALUATION_GENERAL intent: evaluate the generated answer against the original task and independent requirements. Assess correctness, completeness, edge cases, security and whether tests are meaningful. Return a numeric overall score from 0 to 100, a pass/fail verdict, and evidence. Distinguish inferred correctness from executed tests; do not claim execution. Original task: ${task}\n\nIndependent requirements:\n${referenceText.slice(0, 5000)}\n\nGenerated answer:\n${generatedText.slice(0, 8000)}`,
      { intent: "LLM_OUTPUT_EVALUATION_GENERAL" }
    );
    const evaluationText = resultText(evaluation.data);
    const evaluationIntentMatch = matchesIntent(evaluation.data?.intent, expected.evaluation);

    // 4) Deterministic Verification Sandbox Execution (if benchmark available)
    let executionResult: ExecutionResult | null = null;
    let deterministicPass = false;
    if (benchmark) {
      executionResult = runDeterministicVerification(generatedText, benchmark.testSuiteCode);
      deterministicPass = executionResult.passed;
    }

    const totalCost = generation.costUsd + reference.costUsd + evaluation.costUsd;
    const intentMatches = generationIntentMatch && referenceIntentMatch && evaluationIntentMatch;
    const allSignalsFound = generation.verified && reference.verified && evaluation.verified;
    const allReceiptsPresent = Boolean(generation.receipt && reference.receipt && evaluation.receipt);
    const parsedScore = parseEvaluatorScore(evaluation.data, evaluationText);

    const saved = await prisma.procurementRun.update({
      where: { id: runId },
      data: {
        evaluationText,
        evaluationCost: evaluation.costUsd,
        evaluationMs: evaluation.durationMs,
        evaluationIntent: evaluation.data?.intent ?? null,
        evaluationMiner: evaluation.data?.miner_name ?? null,
        evaluationHash: evaluation.data?.signal_hash ?? null,
        evaluationReceipt: JSON.stringify({
          receipt: evaluation.receipt,
          paymentResponse: evaluation.paymentResponse,
          verification: evaluation.verification
        }),
        evaluationResponse: JSON.stringify(evaluation.data),
        evaluationVerified: evaluation.verified,
        evaluationIntentMatch,
        evaluatorScore: parsedScore,
        deterministicPass,
        testResults: executionResult ? JSON.stringify(executionResult) : null,
        totalCost,
        status: allSignalsFound && allReceiptsPresent ? "completed" : "needs_review"
      }
    });

    logEvent("procurement_completed", {
      userId: user.id,
      benchmarkId: benchmark?.id ?? null,
      totalCost,
      deterministicPass,
      intentMatches
    });

    return NextResponse.json({
      run: saved,
      acceptance: {
        expectedIntents: expected,
        intentMatches,
        allSignalsFound,
        allReceiptsPresent,
        deterministicCorrectnessVerified: deterministicPass,
        benchmark: benchmark
          ? {
              id: benchmark.id,
              name: benchmark.name,
              totalTests: executionResult?.totalTests ?? 0,
              passedTests: executionResult?.passedTests ?? 0,
              errors: executionResult?.errors ?? [],
              executionMs: executionResult?.executionMs ?? 0
            }
          : null
      },
      evidence: {
        generation: {
          miner: generation.data?.miner_name,
          intent: generation.data?.intent,
          costUsd: generation.costUsd,
          signalHash: generation.data?.signal_hash,
          receipt: generation.receipt,
          verified: generation.verified,
          verification: generation.verification
        },
        reference: {
          miner: reference.data?.miner_name,
          intent: reference.data?.intent,
          costUsd: reference.costUsd,
          signalHash: reference.data?.signal_hash,
          receipt: reference.receipt,
          verified: reference.verified,
          verification: reference.verification
        },
        evaluation: {
          miner: evaluation.data?.miner_name,
          intent: evaluation.data?.intent,
          costUsd: evaluation.costUsd,
          signalHash: evaluation.data?.signal_hash,
          receipt: evaluation.receipt,
          verified: evaluation.verified,
          verification: evaluation.verification,
          evaluatorScore: parsedScore
        }
      },
      economics: {
        totalCostUsd: totalCost,
        costPerVerifiedCorrectAnswer: deterministicPass ? totalCost : null
      },
      caveat: deterministicPass
        ? "Deterministic test suite executed and passed in sandbox. Evaluator score is recorded alongside executed test evidence."
        : "Evaluator score is a paid model assessment. The run did not complete a passing deterministic test suite."
    });
  } catch (e: any) {
    const message = e?.issues
      ? e.issues.map((i: any) => i.message).join("; ")
      : e.message || "Procurement failed";
    logError("procurement_failed", e, { userId: user?.id, runId });
    if (runId) {
      try {
        await prisma.procurementRun.update({
          where: { id: runId },
          data: { status: "partial", failureReason: message }
        });
      } catch {}
    }
    const partialRun = runId
      ? await prisma.procurementRun.findUnique({ where: { id: runId } }).catch(() => null)
      : null;
    return NextResponse.json(
      { error: message, runId, partialRunSaved: Boolean(runId), run: partialRun },
      { status: 502 }
    );
  }
}
