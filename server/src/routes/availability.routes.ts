import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import {
  createAvailability,
  deleteAvailability,
  listMyAvailability,
} from "../controllers/availability.controller";

const router = Router();

// All routes require the caller to be an instructor.
router.get(
  "/mine",
  authenticateToken,
  requireRole("instructor"),
  listMyAvailability
);
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
