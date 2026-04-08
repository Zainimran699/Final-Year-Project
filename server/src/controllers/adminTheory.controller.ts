import { Request, Response } from "express";
import {
  listQuestions as listQuestionsService,
  createQuestion as createQuestionService,
  updateQuestion as updateQuestionService,
  deleteQuestion as deleteQuestionService,
  ValidationError,
  NotFoundError,
} from "../services/adminTheory.service";

function parseId(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function listQuestions(_req: Request, res: Response) {
  try {
    const questions = await listQuestionsService();
    return res.status(200).json({ questions });
  } catch (err) {
    console.error("adminTheory listQuestions error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createQuestion(req: Request, res: Response) {
  try {
    const question = await createQuestionService(req.body);
    return res.status(201).json({ question });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("adminTheory createQuestion error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateQuestion(req: Request, res: Response) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }
    const question = await updateQuestionService(id, req.body);
    return res.status(200).json({ question });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    console.error("adminTheory updateQuestion error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteQuestion(req: Request, res: Response) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }
    await deleteQuestionService(id);
    return res.status(204).send();
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    console.error("adminTheory deleteQuestion error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
