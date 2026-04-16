import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import * as adminUser from "../controllers/adminUser.controller";
import * as adminTheory from "../controllers/adminTheory.controller";
import * as adminHazard from "../controllers/adminHazard.controller";
import * as adminStats from "../controllers/adminStats.controller";
import * as aiAssistant from "../controllers/aiAssistant.controller";

const router = Router();

// IMPORTANT: All admin routes require auth + admin role. The middleware is
// applied ONCE here at the router level, so every sub-route inherits it
// automatically. Any new route added below is admin-gated by default —
// that's the intended behaviour, but note it's the opposite of the other
// routers in this codebase which attach middleware per-route.
router.use(authenticateToken, requireRole("admin"));

// Users
router.get("/users", adminUser.listUsers);
router.delete("/users/:id", adminUser.deleteUser);

// Theory questions
router.get("/theory", adminTheory.listQuestions);
router.post("/theory", adminTheory.createQuestion);
router.put("/theory/:id", adminTheory.updateQuestion);
router.delete("/theory/:id", adminTheory.deleteQuestion);

// Hazard questions
router.get("/hazard", adminHazard.listQuestions);
router.post("/hazard", adminHazard.createQuestion);
router.put("/hazard/:id", adminHazard.updateQuestion);
router.delete("/hazard/:id", adminHazard.deleteQuestion);

// Stats
router.get("/stats", adminStats.getStats);

// Learners
import * as adminLearner from "../controllers/adminLearner.controller";
router.get("/learners", adminLearner.listLearners);
router.get("/learners/:id/results", adminLearner.getLearnerResults);

// AI Assistant — draft theory/hazard questions via Gemini. Admin-only by
// virtue of the router-level middleware. Drafts are NOT persisted by these
// routes; the admin reviews/edits and then saves through the existing
// CRUD routes above. See [aiAssistant.service.ts] for the full rationale.
router.post("/ai/theory", aiAssistant.generateTheory);
router.post("/ai/theory/batch", aiAssistant.generateTheoryBatchHandler);
router.post("/ai/hazard", aiAssistant.generateHazard);
router.post("/ai/improve", aiAssistant.improveTextHandler);

export default router;
