import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  createBooking,
  listMyBookings,
  cancelBooking,
} from "../controllers/booking.controller";

const router = Router();

router.post("/", authenticateToken, createBooking);
router.get("/me", authenticateToken, listMyBookings);
router.delete("/:id", authenticateToken, cancelBooking);

export default router;
