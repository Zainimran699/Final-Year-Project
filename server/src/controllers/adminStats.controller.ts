import { Request, Response } from "express";
import { getStats as getStatsService } from "../services/adminStats.service";

export async function getStats(_req: Request, res: Response) {
  try {
    const stats = await getStatsService();
    return res.status(200).json({ stats });
  } catch (err) {
    console.error("adminStats getStats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
