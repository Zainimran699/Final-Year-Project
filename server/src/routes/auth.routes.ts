/**
 * Auth routes — maps HTTP endpoints to controller functions.
 *
 * All routes are public (no authenticateToken middleware) because they
 * handle registration, login, and password recovery — operations that
 * happen before the user has a JWT.
 *
 * Mounted at: /api/auth (see server/src/index.ts)
 *
 * Endpoints:
 *   POST /api/auth/register         → Create account + send signup OTP
 *   POST /api/auth/verify-signup    → Verify signup OTP → account active
 *   POST /api/auth/resend-signup    → Resend signup OTP
 *   POST /api/auth/login            → Authenticate + get JWT
 *   POST /api/auth/forgot-password  → Send reset OTP
 *   POST /api/auth/reset-password   → Verify reset OTP + change password
 */

import { Router } from "express";
import {
  register,
  verifySignup,
  resendSignup,
  login,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";

const router = Router();

// Registration + verification
router.post("/register", register);
router.post("/verify-signup", verifySignup);
router.post("/resend-signup", resendSignup);

// Login
router.post("/login", login);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
