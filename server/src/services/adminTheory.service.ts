import { prisma } from "../lib/prisma";

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

export type AdminTheoryInput = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  category: string;
};

const VALID_OPTIONS = ["a", "b", "c", "d"] as const;

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value;
}

function validateInput(input: unknown): asserts input is AdminTheoryInput {
  if (input === null || typeof input !== "object") {
    throw new ValidationError("body must be a JSON object");
  }
  const obj = input as Record<string, unknown>;

  requireNonEmptyString(obj.questionText, "questionText");
  requireNonEmptyString(obj.optionA, "optionA");
  requireNonEmptyString(obj.optionB, "optionB");
  requireNonEmptyString(obj.optionC, "optionC");
  requireNonEmptyString(obj.optionD, "optionD");
  requireNonEmptyString(obj.category, "category");

  if (
    typeof obj.correctOption !== "string" ||
    !VALID_OPTIONS.includes(
      obj.correctOption as (typeof VALID_OPTIONS)[number]
    )
  ) {
    throw new ValidationError(
      `correctOption must be one of: ${VALID_OPTIONS.join(", ")}`
    );
  }
}

export async function listQuestions() {
  // Admin gets full fields including correctOption + category.
  return prisma.theoryQuestion.findMany({ orderBy: [{ id: "asc" }] });
}

export async function createQuestion(input: unknown) {
  validateInput(input);
  return prisma.theoryQuestion.create({ data: input });
}

export async function updateQuestion(id: number, input: unknown) {
  validateInput(input);
  const existing = await prisma.theoryQuestion.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("theory question not found");
  }
  return prisma.theoryQuestion.update({ where: { id }, data: input });
}

export async function deleteQuestion(id: number): Promise<void> {
  const existing = await prisma.theoryQuestion.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("theory question not found");
  }
  // Cascades to AIExplanation rows via onDelete: Cascade in the schema.
  await prisma.theoryQuestion.delete({ where: { id } });
}
