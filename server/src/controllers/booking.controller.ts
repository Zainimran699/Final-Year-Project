import { Request, Response } from "express";
import {
  createBooking as createBookingService,
  listMyBookings as listMyBookingsService,
  cancelBooking as cancelBookingService,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../services/booking.service";

export async function createBooking(req: Request, res: Response) {
  try {
    const { availabilityId } = req.body ?? {};

    if (typeof availabilityId !== "number" || !Number.isInteger(availabilityId)) {
      return res
        .status(400)
        .json({ error: "availabilityId must be an integer" });
    }

    // safe: authenticateToken runs before this handler.
    const learnerId = req.user!.id;

    const booking = await createBookingService(learnerId, availabilityId);
    return res.status(201).json({ booking });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof ConflictError) {
      return res.status(409).json({ error: err.message });
    }
    console.error("booking createBooking error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listMyBookings(req: Request, res: Response) {
  try {
    const learnerId = req.user!.id;
    const bookings = await listMyBookingsService(learnerId);
    return res.status(200).json({ bookings });
  } catch (err) {
    console.error("booking listMyBookings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function cancelBooking(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const learnerId = req.user!.id;
    const booking = await cancelBookingService(learnerId, id);
    return res.status(200).json({ booking });
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
    console.error("booking cancelBooking error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
