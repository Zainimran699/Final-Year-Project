import { Request, Response } from "express";
import {
  getMyProfile,
  upsertProfile,
  ValidationError,
} from "../services/instructorProfile.service";

// GET /api/instructors/profile/me — returns the calling instructor's profile.
export async function getProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const profile = await getMyProfile(userId);
    return res.status(200).json({ profile });
  } catch (err) {
    console.error("instructorProfile getProfile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/instructors/profile — create or update the instructor profile.
export async function saveProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { bio, location, hourlyRate } = req.body ?? {};

    if (typeof location !== "string" || typeof hourlyRate !== "number") {
      return res
        .status(400)
        .json({ error: "location (string) and hourlyRate (number) are required" });
    }

    const profile = await upsertProfile(userId, { bio, location, hourlyRate });
    return res.status(200).json({ profile });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("instructorProfile saveProfile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
