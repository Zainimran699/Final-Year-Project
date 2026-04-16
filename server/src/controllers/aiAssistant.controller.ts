/**
 * aiAssistant.controller — HTTP adapters for the admin AI drafting service.
 *
 * Mount paths (all under /api/admin/ai, gated by admin-only middleware at
 * the router level — see [admin.routes.ts]):
 *   POST /api/admin/ai/theory         → generateTheoryQuestion
 *   POST /api/admin/ai/theory/batch   → generateTheoryBatch
 *   POST /api/admin/ai/hazard         → generateHazardQuestion
 *   POST /api/admin/ai/improve        → improveText
 *
 * Response shape:
 *   - Single theory: { question: TheoryQuestionDraft }
 *   - Batch theory:  { questions: TheoryQuestionDraft[] }
 *   - Hazard:        { question: HazardQuestionDraft }
 *   - Improve text:  { improved: string }
 *
 * Error mapping (matches the rest of the controllers/ directory):
 *   ValidationError        → 400
 *   UpstreamAIError        → 503 (friendly "try again" message)
 *   anything else          → 500
 */

import { Request, Response } from "express";
import {
  generateTheoryQuestion,
  generateTheoryBatch,
  generateHazardQuestion,
  improveText,
  ValidationError,
  UpstreamAIError,
  type ImproveTextInput,
} from "../services/aiAssistant.service";

/**
 * Map a service error onto an HTTP response. Centralised so every handler
 * in this file handles the AI-specific error taxonomy the same way.
 */
function sendError(res: Response, err: unknown, tag: string) {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof UpstreamAIError) {
    console.error(`${tag} upstream AI error:`, err);
    return res.status(503).json({ error: err.message });
  }
  console.error(`${tag} error:`, err);
  return res.status(500).json({ error: "Internal server error" });
}

// -------------------------------------------------------------------------

export async function generateTheory(req: Request, res: Response) {
  try {
    const { topic, category, improve } = req.body ?? {};

    // All three fields are optional but must be the right type if provided.
    if (topic !== undefined && typeof topic !== "string") {
      return res.status(400).json({ error: "topic must be a string" });
    }
    if (category !== undefined && typeof category !== "string") {
      return res.status(400).json({ error: "category must be a string" });
    }
    if (improve !== undefined && (typeof improve !== "object" || improve === null)) {
      return res.status(400).json({ error: "improve must be an object" });
    }

    const question = await generateTheoryQuestion({ topic, category, improve });
    return res.status(200).json({ question });
  } catch (err) {
    return sendError(res, err, "generateTheory");
  }
}

// -------------------------------------------------------------------------

export async function generateTheoryBatchHandler(req: Request, res: Response) {
  try {
    const { topic, count, category } = req.body ?? {};

    if (typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "topic is required" });
    }
    if (typeof count !== "number" || !Number.isInteger(count)) {
      return res.status(400).json({ error: "count must be an integer" });
    }
    if (category !== undefined && typeof category !== "string") {
      return res.status(400).json({ error: "category must be a string" });
    }

    const questions = await generateTheoryBatch({
      topic: topic.trim(),
      count,
      category,
    });
    return res.status(200).json({ questions });
  } catch (err) {
    return sendError(res, err, "generateTheoryBatch");
  }
}

// -------------------------------------------------------------------------

export async function generateHazard(req: Request, res: Response) {
  try {
    const { imageUrl, focus, improve } = req.body ?? {};

    if (typeof imageUrl !== "string" || !imageUrl.trim()) {
      return res.status(400).json({ error: "imageUrl is required" });
    }
    if (focus !== undefined && typeof focus !== "string") {
      return res.status(400).json({ error: "focus must be a string" });
    }
    if (improve !== undefined && (typeof improve !== "object" || improve === null)) {
      return res.status(400).json({ error: "improve must be an object" });
    }

    const question = await generateHazardQuestion({
      imageUrl: imageUrl.trim(),
      focus,
      improve,
    });
    return res.status(200).json({ question });
  } catch (err) {
    return sendError(res, err, "generateHazard");
  }
}

// -------------------------------------------------------------------------

const VALID_KINDS: ImproveTextInput["kind"][] = [
  "theory-question",
  "theory-option",
  "hazard-question",
  "hazard-description",
  "generic",
];

export async function improveTextHandler(req: Request, res: Response) {
  try {
    const { value, kind, context } = req.body ?? {};

    if (typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ error: "value is required" });
    }
    if (
      typeof kind !== "string" ||
      !VALID_KINDS.includes(kind as ImproveTextInput["kind"])
    ) {
      return res.status(400).json({
        error: `kind must be one of: ${VALID_KINDS.join(", ")}`,
      });
    }
    if (context !== undefined && typeof context !== "string") {
      return res.status(400).json({ error: "context must be a string" });
    }

    const result = await improveText({
      value: value.trim(),
      kind: kind as ImproveTextInput["kind"],
      context,
    });
    return res.status(200).json(result);
  } catch (err) {
    return sendError(res, err, "improveText");
  }
}
