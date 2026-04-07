import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  listInstructors,
  getInstructor,
} from "../controllers/instructor.controller";

const router = Router();

router.get("/", authenticateToken, listInstructors);
router.get("/:id", authenticateToken, getInstructor);

export default router;
