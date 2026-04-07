import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  listQuestions,
  submitTest,
  explainAnswer,
} from "../controllers/theory.controller";

const router = Router();

router.get("/questions", authenticateToken, listQuestions);
router.post("/submit", authenticateToken, submitTest);
router.post("/explain", authenticateToken, explainAnswer);

export default router;
