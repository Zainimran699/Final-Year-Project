import { prisma } from "../lib/prisma";

const QUESTION_COUNT = 10;
const PASS_THRESHOLD = 0.86; // matches UK DVSA pass mark (43/50)
const VALID_OPTIONS = ["a", "b", "c", "d"] as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Note: no correctOption field — enforced by the select clause in getRandomQuestions.
export type PublicTheoryQuestion = {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  category: string;
};

export type SubmitAnswer = { questionId: number; selected: string };

export type AnswerResult = {
  questionId: number;
  selected: string;
  correctOption: string;
  isCorrect: boolean;
};

export type SubmitResult = {
  score: number;
  total: number;
  passed: boolean;
  results: AnswerResult[];
};

export async function getRandomQuestions(): Promise<PublicTheoryQuestion[]> {
  const questions = await prisma.theoryQuestion.findMany({
    select: {
      id: true,
      questionText: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      category: true,
    },
  });

  // Fisher-Yates shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions.slice(0, QUESTION_COUNT);
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

  const fetched = await prisma.theoryQuestion.findMany({
    where: { id: { in: Array.from(uniqueIds) } },
    select: { id: true, correctOption: true },
  });

  if (fetched.length !== uniqueIds.size) {
    throw new ValidationError("one or more questionIds do not exist");
  }

  const correctById = new Map(fetched.map((q) => [q.id, q.correctOption]));

  const results: AnswerResult[] = answers.map((a) => {
    const correctOption = correctById.get(a.questionId)!;
    return {
      questionId: a.questionId,
      selected: a.selected,
      correctOption,
      isCorrect: a.selected === correctOption,
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
      type: "theory",
    },
  });

  return { score, total, passed, results };
}
