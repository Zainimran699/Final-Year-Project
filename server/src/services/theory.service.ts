import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { geminiModel } from "../lib/gemini";

const QUESTION_COUNT = 10;
const PASS_THRESHOLD = 0.86; // matches UK DVSA pass mark (43/50)
const VALID_OPTIONS = ["a", "b", "c", "d"] as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
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

function buildExplanationPrompt(
  question: {
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: string;
  },
  selectedOption: string
): string {
  const optionTextByLetter: Record<string, string> = {
    a: question.optionA,
    b: question.optionB,
    c: question.optionC,
    d: question.optionD,
  };
  const selectedLabel = selectedOption.toUpperCase();
  const selectedText = optionTextByLetter[selectedOption];
  const correctLabel = question.correctOption.toUpperCase();
  const correctText = optionTextByLetter[question.correctOption];

  return `You are a friendly UK driving theory test tutor.

A learner answered the following multiple-choice question incorrectly.

Question: ${question.questionText}
Options:
  a) ${question.optionA}
  b) ${question.optionB}
  c) ${question.optionC}
  d) ${question.optionD}

The learner chose: ${selectedLabel} (${selectedText})
The correct answer is: ${correctLabel} (${correctText})

In 2-4 short sentences, explain in plain English why the learner's answer is wrong and why the correct answer is right. Be encouraging and concise. Do not greet the learner or restate the question.`;
}

export async function explainAnswer(
  questionId: number,
  selectedOption: string
): Promise<{ cached: boolean; explanation: string }> {
  if (!VALID_OPTIONS.includes(selectedOption as (typeof VALID_OPTIONS)[number])) {
    throw new ValidationError("selectedOption must be one of a, b, c, d");
  }

  // Cache-first (CLAUDE.md rule #4 / FR-08 / R-03).
  const cached = await prisma.aIExplanation.findUnique({
    where: { questionId_selectedOption: { questionId, selectedOption } },
  });
  if (cached) {
    return { cached: true, explanation: cached.responseText };
  }

  const question = await prisma.theoryQuestion.findUnique({
    where: { id: questionId },
  });
  if (!question) {
    throw new NotFoundError(`question ${questionId} not found`);
  }

  if (selectedOption === question.correctOption) {
    throw new ValidationError(
      "explanations are only available for incorrect answers"
    );
  }

  const prompt = buildExplanationPrompt(question, selectedOption);
  const result = await geminiModel.generateContent(prompt);
  const explanation = result.response.text().trim();

  if (!explanation) {
    throw new Error("Gemini returned an empty response");
  }

  try {
    await prisma.aIExplanation.create({
      data: { questionId, selectedOption, responseText: explanation },
    });
  } catch (err) {
    // P2002 = unique constraint violation: another concurrent request beat us
    // to populating the cache. Re-fetch and return the winner's explanation
    // so the response is consistent.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const winner = await prisma.aIExplanation.findUnique({
        where: { questionId_selectedOption: { questionId, selectedOption } },
      });
      if (winner) {
        return { cached: true, explanation: winner.responseText };
      }
    }
    throw err;
  }

  return { cached: false, explanation };
}
