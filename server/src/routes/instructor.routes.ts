import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import {
  listInstructors,
  getInstructor,
  listMyBookings,
} from "../controllers/instructor.controller";
import {
  getProfile,
  saveProfile,
} from "../controllers/instructorProfile.controller";

const router = Router();

// Public-ish listing (any authed user can browse instructors).
router.get("/", authenticateToken, listInstructors);

// Instructor-only: own profile management.
// IMPORTANT: /profile/me must come before /:id so Express doesn't match
// "profile" as an instructor id.
router.get(
  "/profile/me",
  authenticateToken,
  requireRole("instructor"),
  getProfile
);
router.post(
  "/profile",
  authenticateToken,
  requireRole("instructor"),
  saveProfile
);

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
