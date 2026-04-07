import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { getMyProgress } from "../controllers/progress.controller";

const router = Router();

router.get("/me", authenticateToken, getMyProgress);

export default router;
