import { Request, Response } from "express";
import {
  listInstructors as listInstructorsService,
  getInstructorById,
  listMyBookings as listMyBookingsService,
  NotFoundError,
} from "../services/instructor.service";

export async function listInstructors(req: Request, res: Response) {
  try {
    // Optional ?location= query param for town/postcode search.
    const location =
      typeof req.query.location === "string" ? req.query.location : undefined;
    const instructors = await listInstructorsService(location);
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

export async function listMyBookings(req: Request, res: Response) {
  try {
    const instructorId = req.user!.id;
    const bookings = await listMyBookingsService(instructorId);
    return res.status(200).json({ bookings });
  } catch (err) {
    console.error("instructor listMyBookings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
