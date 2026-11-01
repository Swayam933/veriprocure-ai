import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const runs = await prisma.procurementRun.findMany({
      where: {
        status: { in: ["completed", "needs_review"] }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    const rows = new Map<
      string,
      {
        miner: string;
        calls: number;
        spend: number;
        evaluatorScoreTotal: number;
        scoredRuns: number;
        verifiedSignals: number;
        generationCalls: number;
        deterministicPasses: number;
      }
    >();

    let totalSpend = 0;
    let totalDeterministicPasses = 0;
    let totalScoredRuns = 0;

    for (const run of runs) {
      totalSpend += run.totalCost;
      if (run.deterministicPass) totalDeterministicPasses += 1;

      const miners = [
        { name: run.generationMiner, cost: run.generationCost, isGeneration: true },
        { name: run.referenceMiner, cost: run.referenceCost, isGeneration: false },
        { name: run.evaluationMiner, cost: run.evaluationCost, isGeneration: false }
      ];

      for (const item of miners) {
        if (!item.name) continue;
        const row = rows.get(item.name) ?? {
          miner: item.name,
          calls: 0,
          spend: 0,
          evaluatorScoreTotal: 0,
          scoredRuns: 0,
          verifiedSignals: 0,
          generationCalls: 0,
          deterministicPasses: 0
        };
        row.calls += 1;
        row.spend += item.cost;
        if (item.isGeneration) {
          row.generationCalls += 1;
          if (run.deterministicPass) {
            row.deterministicPasses += 1;
          }
        }
        rows.set(item.name, row);
      }

      if (run.evaluatorScore !== null) {
        totalScoredRuns += 1;
        const evaluator = run.evaluationMiner;
        if (evaluator) {
          const row = rows.get(evaluator);
          if (row) {
            row.evaluatorScoreTotal += run.evaluatorScore;
            row.scoredRuns += 1;
          }
        }
      }

      if (run.generationVerified && run.generationMiner && rows.has(run.generationMiner)) {
        rows.get(run.generationMiner)!.verifiedSignals += 1;
      }
      if (run.referenceVerified && run.referenceMiner && rows.has(run.referenceMiner)) {
        rows.get(run.referenceMiner)!.verifiedSignals += 1;
      }
      if (run.evaluationVerified && run.evaluationMiner && rows.has(run.evaluationMiner)) {
        rows.get(run.evaluationMiner)!.verifiedSignals += 1;
      }
    }

    const items = [...rows.values()].map((r) => {
      const passRate = r.generationCalls > 0 ? (r.deterministicPasses / r.generationCalls) * 100 : null;
      const costPerCorrect = r.deterministicPasses > 0 ? r.spend / r.deterministicPasses : null;
      return {
        ...r,
        averageEvaluatorScore: r.scoredRuns ? r.evaluatorScoreTotal / r.scoredRuns : null,
        deterministicPassRate: passRate,
        costPerVerifiedCorrectAnswer: costPerCorrect
      };
    }).sort((a, b) => {
      if (b.deterministicPasses !== a.deterministicPasses) {
        return b.deterministicPasses - a.deterministicPasses;
      }
      return (b.averageEvaluatorScore ?? -1) - (a.averageEvaluatorScore ?? -1);
    });

    return NextResponse.json({
      summary: {
        totalRuns: runs.length,
        totalSpendUsd: totalSpend,
        totalDeterministicPasses,
        overallCostPerVerifiedCorrect:
          totalDeterministicPasses > 0 ? totalSpend / totalDeterministicPasses : null
      },
      methodology:
        "Dual-evaluation model economy: LLM assessment score (model opinion) reported alongside isolated sandbox test pass rate (deterministic ground truth). Cost-per-verified-correct is calculated strictly against passing deterministic test suites.",
      items
    });
  } catch (e: any) {
    return NextResponse.json({ summary: { totalRuns: 0, totalSpendUsd: 0, totalDeterministicPasses: 0 }, items: [], error: e.message });
  }
}
