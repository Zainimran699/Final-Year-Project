import { prisma } from "../lib/prisma";

export type TestResultRow = {
  id: number;
  type: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  takenAt: Date;
};

export type TypeStats = {
  attempts: number;
  passed: number;
  passRate: number; // 0..1, 0 if attempts === 0
  avgScorePct: number; // 0..1, 0 if attempts === 0
  bestScorePct: number; // 0..1, 0 if attempts === 0
  latest: TestResultRow | null;
};

export type ProgressSummary = {
  results: TestResultRow[];
  stats: {
    theory: TypeStats;
    hazard: TypeStats;
    overall: { attempts: number; passed: number; passRate: number };
  };
};

// Empty-attempts guard. Without it, Math.max(...[]) returns -Infinity (which
// JSON-serialises to null) and 0/0 → NaN — both would break the frontend.
// The caller is responsible for passing rows already sorted newest-first;
// `latest` trusts rows[0].
function computeStats(rows: TestResultRow[]): TypeStats {
  const attempts = rows.length;
  if (attempts === 0) {
    return {
      attempts: 0,
      passed: 0,
      passRate: 0,
      avgScorePct: 0,
      bestScorePct: 0,
      latest: null,
    };
  }

  const passed = rows.filter((r) => r.passed).length;
  const passRate = passed / attempts;

  const pcts = rows.map((r) => r.score / r.totalQuestions);
  const avgScorePct = pcts.reduce((sum, p) => sum + p, 0) / attempts;
  const bestScorePct = Math.max(...pcts);

  return {
    attempts,
    passed,
    passRate,
    avgScorePct,
    bestScorePct,
    latest: rows[0],
  };
}

export async function getMyProgress(userId: number): Promise<ProgressSummary> {
  const results = await prisma.testResult.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      score: true,
      totalQuestions: true,
      passed: true,
      takenAt: true,
    },
    orderBy: [{ takenAt: "desc" }],
  });

  const theory = results.filter((r) => r.type === "theory");
  const hazard = results.filter((r) => r.type === "hazard");

  const overallPassed = results.filter((r) => r.passed).length;
  const overall = {
    attempts: results.length,
    passed: overallPassed,
    passRate: results.length === 0 ? 0 : overallPassed / results.length,
  };

  return {
    results,
    stats: {
      theory: computeStats(theory),
      hazard: computeStats(hazard),
      overall,
    },
  };
}
