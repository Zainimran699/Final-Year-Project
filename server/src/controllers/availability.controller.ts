import { Request, Response } from "express";
import {
  createAvailability as createAvailabilityService,
  deleteAvailability as deleteAvailabilityService,
  listMyAvailability as listMyAvailabilityService,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../services/availability.service";

// GET /api/availability/mine — list all of this instructor's slots.
export async function listMyAvailability(req: Request, res: Response) {
  try {
    const instructorId = req.user!.id;
    const slots = await listMyAvailabilityService(instructorId);
    return res.status(200).json({ slots });
  } catch (err) {
    console.error("availability listMyAvailability error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createAvailability(req: Request, res: Response) {
  try {
    const { slotDate, startTime, endTime } = req.body ?? {};

    if (
      typeof slotDate !== "string" ||
      typeof startTime !== "string" ||
      typeof endTime !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "slotDate, startTime, endTime must be strings" });
    }

    // safe: authenticateToken + requireRole("instructor") run before this handler.
    const instructorId = req.user!.id;

    const availability = await createAvailabilityService(instructorId, {
      slotDate,
      startTime,
      endTime,
    });
    return res.status(201).json({ availability });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("availability createAvailability error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteAvailability(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const instructorId = req.user!.id;
    await deleteAvailabilityService(instructorId, id);
    return res.status(204).send();
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof ForbiddenError) {
      return res.status(403).json({ error: err.message });
    }
    if (err instanceof ConflictError) {
      return res.status(409).json({ error: err.message });
    }
    console.error("availability deleteAvailability error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
