/**
 * Auth controller — HTTP request/response handling for authentication.
 *
 * Each function here:
 *   1. Validates the shape of the incoming request body (types, lengths).
 *   2. Delegates to auth.service.ts for business logic + DB access.
 *   3. Catches typed errors from the service and maps them to HTTP codes.
 *
 * Routes (defined in auth.routes.ts):
 *   POST /api/auth/register         → register()
 *   POST /api/auth/verify-signup    → verifySignup()
 *   POST /api/auth/resend-signup    → resendSignup()
 *   POST /api/auth/login            → login()
 *   POST /api/auth/forgot-password  → forgotPassword()
 *   POST /api/auth/reset-password   → resetPassword()
 */

import { Request, Response } from "express";
import {
  registerUser,
  verifySignupOtp,
  resendSignupOtp,
  loginUser,
  forgotPassword as forgotPasswordService,
  resetPassword as resetPasswordService,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from "../services/auth.service";

// Roles the registration form is allowed to create.
const ALLOWED_ROLES = ["learner", "instructor", "admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

/**
 * Register a new user. The account starts as unverified; a signup OTP is
 * emailed to the address provided. The client should redirect to the
 * OTP verification page after a successful 201 response.
 */
export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role, location } = req.body ?? {};

    // --- Input validation ---
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof role !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "name, email, password and role are required" });
    }

    if (!name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!email.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
      return res
        .status(400)
        .json({ error: "Role must be learner, instructor or admin" });
    }

    // Location is optional but must be a string if provided.
    if (location !== undefined && typeof location !== "string") {
      return res.status(400).json({ error: "Location must be a string" });
    }

    // --- Delegate to service ---
    const user = await registerUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role as AllowedRole,
      location,
    });

    return res.status(201).json({
      user,
      message:
        "Registration successful. Please check your email for the verification code.",
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      return res.status(409).json({ error: err.message });
    }
    console.error("register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/verify-signup
// ---------------------------------------------------------------------------

/**
 * Verify the signup OTP so the account becomes active.
 * Body: { email, otp }
 */
export async function verifySignup(req: Request, res: Response) {
  try {
    const { email, otp } = req.body ?? {};

    if (typeof email !== "string" || typeof otp !== "string") {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    if (!otp.trim()) {
      return res.status(400).json({ error: "OTP is required" });
    }

    const user = await verifySignupOtp(email.trim().toLowerCase(), otp.trim());

    return res.status(200).json({
      user,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("verifySignup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/resend-signup
// ---------------------------------------------------------------------------

/**
 * Re-generate and resend the signup OTP.
 * Body: { email }
 */
export async function resendSignup(req: Request, res: Response) {
  try {
    const { email } = req.body ?? {};

    if (typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    await resendSignupOtp(email.trim().toLowerCase());

    // Always return success — don't reveal whether the email exists.
    return res.status(200).json({
      message: "If that email is registered, a new code has been sent.",
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(429).json({ error: err.message });
    }
    console.error("resendSignup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

/**
 * Authenticate with email + password. Returns { token, user }.
 * Blocked if the account is not yet verified (403).
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res
        .status(400)
        .json({ error: "Email and password are required" });
    }

    const result = await loginUser({
      email: email.trim().toLowerCase(),
      password,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return res.status(401).json({ error: err.message });
    }
    // ForbiddenError = account not verified. Return 403 with a code the
    // frontend can use to redirect to the verification page.
    if (err instanceof ForbiddenError) {
      return res
        .status(403)
        .json({ error: err.message, code: "NOT_VERIFIED" });
    }
    console.error("login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------

/**
 * Send a password-reset OTP to the given email.
 * Body: { email }
 * Always returns 200 — don't reveal whether the email is registered.
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body ?? {};

    if (typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    await forgotPasswordService(email.trim().toLowerCase());

    return res.status(200).json({
      message:
        "If that email is registered, a reset code has been sent. Please check your inbox.",
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(429).json({ error: err.message });
    }
    console.error("forgotPassword error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------

/**
 * Reset the user's password using a valid reset OTP.
 * Body: { email, otp, newPassword, confirmPassword }
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body ?? {};

    // --- Input validation ---
    if (typeof email !== "string" || typeof otp !== "string") {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    if (typeof newPassword !== "string" || typeof confirmPassword !== "string") {
      return res
        .status(400)
        .json({ error: "New password and confirmation are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    await resetPasswordService(
      email.trim().toLowerCase(),
      otp.trim(),
      newPassword
    );

    return res.status(200).json({
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("resetPassword error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
