import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import {
  createAvailability,
  deleteAvailability,
} from "../controllers/availability.controller";

const router = Router();

// Both routes require the caller to be an instructor.
router.post(
  "/",
  authenticateToken,
  requireRole("instructor"),
  createAvailability
);
router.delete(
  "/:id",
  authenticateToken,
  requireRole("instructor"),
  deleteAvailability
);

export default router;
