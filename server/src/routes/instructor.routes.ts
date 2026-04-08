import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import {
  listInstructors,
  getInstructor,
  listMyBookings,
} from "../controllers/instructor.controller";

const router = Router();

router.get("/", authenticateToken, listInstructors);
// IMPORTANT: /me/bookings must come before /:id so Express doesn't match
// "me" as an instructor id and route to getInstructor.
router.get(
  "/me/bookings",
  authenticateToken,
  requireRole("instructor"),
  listMyBookings
);
router.get("/:id", authenticateToken, getInstructor);

export default router;
