import { prisma } from "../lib/prisma";

const PASS_THRESHOLD = 0.6; // 3/5 = 60%
const VALID_OPTIONS = ["a", "b", "c", "d"] as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Note: NO correctOption AND NO description — both are answer-revealing,
// enforced by the select clause in getShuffledQuestions.
export type PublicHazardQuestion = {
  id: number;
  imageUrl: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

export type SubmitAnswer = { questionId: number; selected: string };

export type AnswerResult = {
  questionId: number;
  selected: string;
  correctOption: string;
  isCorrect: boolean;
  description: string;
};

export type SubmitResult = {
  score: number;
  total: number;
  passed: boolean;
  results: AnswerResult[];
};

export async function getShuffledQuestions(): Promise<PublicHazardQuestion[]> {
  const questions = await prisma.hazardQuestion.findMany({
    select: {
      id: true,
      imageUrl: true,
      questionText: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
    },
  });

  // Fisher-Yates shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions;
}

export async function submitTest(
  userId: number,
  answers: SubmitAnswer[]
): Promise<SubmitResult> {
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new ValidationError("answers must be a non-empty array");
  }

  const ids = answers.map((a) => a.questionId);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    throw new ValidationError("duplicate questionId in answers");
  }

  for (const a of answers) {
    if (!VALID_OPTIONS.includes(a.selected as (typeof VALID_OPTIONS)[number])) {
      throw new ValidationError(
        `invalid selected value for questionId ${a.questionId}`
      );
    }
  }

  const fetched = await prisma.hazardQuestion.findMany({
    where: { id: { in: Array.from(uniqueIds) } },
    select: { id: true, correctOption: true, description: true },
  });

  if (fetched.length !== uniqueIds.size) {
    throw new ValidationError("one or more questionIds do not exist");
  }

  const byId = new Map(
    fetched.map((q) => [q.id, { correctOption: q.correctOption, description: q.description }])
  );

  const results: AnswerResult[] = answers.map((a) => {
    const meta = byId.get(a.questionId)!;
    return {
      questionId: a.questionId,
      selected: a.selected,
      correctOption: meta.correctOption,
      isCorrect: a.selected === meta.correctOption,
      description: meta.description,
    };
  });

  const score = results.filter((r) => r.isCorrect).length;
  const total = results.length;
  const passed = score / total >= PASS_THRESHOLD;

  await prisma.testResult.create({
    data: {
      userId,
      score,
      totalQuestions: total,
      passed,
      type: "hazard",
    },
  });

  return { score, total, passed, results };
}
