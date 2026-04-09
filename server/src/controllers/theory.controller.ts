import { Request, Response } from "express";
import {
  getRandomQuestions,
  submitTest as submitTestService,
  explainAnswer as explainAnswerService,
  ValidationError,
  NotFoundError,
  SubmitAnswer,
} from "../services/theory.service";

export async function listQuestions(_req: Request, res: Response) {
  try {
    const questions = await getRandomQuestions();
    return res.status(200).json({ questions });
  } catch (err) {
    console.error("listQuestions error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function submitTest(req: Request, res: Response) {
  try {
    const { answers } = req.body ?? {};

    if (!Array.isArray(answers) || answers.length === 0) {
      return res
        .status(400)
        .json({ error: "answers must be a non-empty array" });
    }

    for (const a of answers) {
      if (
        a === null ||
        typeof a !== "object" ||
        typeof a.questionId !== "number" ||
        typeof a.selected !== "string"
      ) {
        return res.status(400).json({
          error: "each answer must be { questionId: number, selected: string }",
        });
      }
    }

    // safe: authenticateToken runs before this handler.
    const userId = req.user!.id;

    const result = await submitTestService(userId, answers as SubmitAnswer[]);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("submitTest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function explainAnswer(req: Request, res: Response) {
  try {
    const { questionId, selectedOption } = req.body ?? {};

    if (typeof questionId !== "number" || typeof selectedOption !== "string") {
      return res.status(400).json({
        error: "questionId (number) and selectedOption (string) are required",
      });
    }

    const result = await explainAnswerService(questionId, selectedOption);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    // Gemini upstream errors (rate limit, quota, network) bubble up as a
    // GoogleGenerativeAIFetchError that carries a numeric HTTP `status`.
    // Surface those to the learner as 503 with a friendly message rather
    // than an opaque 500, so the UI can prompt them to try again later.
    // R-03 in the spec.
    const upstream = err as { status?: number; constructor?: { name?: string } };
    if (
      typeof upstream.status === "number" &&
      upstream.status >= 400 &&
      upstream.constructor?.name?.startsWith("GoogleGenerativeAI")
    ) {
      console.error("explainAnswer Gemini upstream error:", err);
      return res.status(503).json({
        error:
          "AI explanation is temporarily unavailable. Please try again later.",
      });
    }
    console.error("explainAnswer error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
