import { Request, Response } from "express";
import { getMyProgress as getMyProgressService } from "../services/progress.service";

export async function getMyProgress(req: Request, res: Response) {
  try {
    // safe: authenticateToken runs before this handler.
    const userId = req.user!.id;
    const progress = await getMyProgressService(userId);
    return res.status(200).json({ progress });
  } catch (err) {
    console.error("progress getMyProgress error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
