import { prisma } from "../lib/prisma";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export type AdminLearnerRow = {
  id: number;
  name: string;
  email: string;
  location: string | null;
  createdAt: Date;
  _count: { testResults: number };
};

// Lists all learners with basic stats (test count).
export async function listLearners(): Promise<AdminLearnerRow[]> {
  const rows = await prisma.user.findMany({
    where: { role: "learner" },
    select: {
      id: true,
      name: true,
      email: true,
      location: true,
      createdAt: true,
      _count: { select: { testResults: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });
  return rows;
}

export type LearnerResultRow = {
  id: number;
  type: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  timeTakenSeconds: number | null;
  takenAt: Date;
};

// Returns all test results for a specific learner, newest first.
export async function getLearnerResults(
  learnerId: number
): Promise<LearnerResultRow[]> {
  // Verify the user exists and is a learner.
  const user = await prisma.user.findUnique({
    where: { id: learnerId },
    select: { role: true },
  });
  if (!user || user.role !== "learner") {
    throw new NotFoundError("learner not found");
  }

  return prisma.testResult.findMany({
    where: { userId: learnerId },
    select: {
      id: true,
      type: true,
      score: true,
      totalQuestions: true,
      passed: true,
      timeTakenSeconds: true,
      takenAt: true,
    },
    orderBy: [{ takenAt: "desc" }],
  });
}
