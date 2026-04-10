import { Request, Response } from "express";
import {
  getShuffledQuestions,
  submitTest as submitTestService,
  ValidationError,
  SubmitAnswer,
} from "../services/hazard.service";

export async function listQuestions(_req: Request, res: Response) {
  try {
    const questions = await getShuffledQuestions();
    return res.status(200).json({ questions });
  } catch (err) {
    console.error("hazard listQuestions error:", err);
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
    const timeTakenSeconds =
      typeof req.body.timeTakenSeconds === "number"
        ? Math.round(req.body.timeTakenSeconds)
        : undefined;

    const result = await submitTestService(
      userId,
      answers as SubmitAnswer[],
      timeTakenSeconds
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("hazard submitTest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
