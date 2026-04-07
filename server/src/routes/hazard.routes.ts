import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { listQuestions, submitTest } from "../controllers/hazard.controller";

const router = Router();

router.get("/questions", authenticateToken, listQuestions);
router.post("/submit", authenticateToken, submitTest);

export default router;
