import { Request, Response } from "express";
import {
  listLearners as listLearnersService,
  getLearnerResults as getLearnerResultsService,
  NotFoundError,
} from "../services/adminLearner.service";

function parseId(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/admin/learners — list all learners with test counts.
export async function listLearners(_req: Request, res: Response) {
  try {
    const learners = await listLearnersService();
    return res.status(200).json({ learners });
  } catch (err) {
    console.error("adminLearner listLearners error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/admin/learners/:id/results — all test results for one learner.
export async function getLearnerResults(req: Request, res: Response) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const results = await getLearnerResultsService(id);
    return res.status(200).json({ results });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    console.error("adminLearner getLearnerResults error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
