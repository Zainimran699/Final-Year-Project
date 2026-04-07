import { Request, Response } from "express";
import {
  listInstructors as listInstructorsService,
  getInstructorById,
  NotFoundError,
} from "../services/instructor.service";

export async function listInstructors(_req: Request, res: Response) {
  try {
    const instructors = await listInstructorsService();
    return res.status(200).json({ instructors });
  } catch (err) {
    console.error("instructor listInstructors error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getInstructor(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const instructor = await getInstructorById(id);
    return res.status(200).json({ instructor });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    console.error("instructor getInstructor error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
