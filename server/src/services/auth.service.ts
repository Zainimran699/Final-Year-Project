/**
 * Authentication service — business logic for every auth-related operation.
 *
 * Responsibilities:
 *   1. Register a new user (unverified) and generate a signup OTP.
 *   2. Verify the signup OTP so the account becomes active.
 *   3. Resend the signup OTP (with cooldown guard).
 *   4. Login (email + password), blocked if the account is not verified.
 *   5. Forgot-password: generate and email a reset OTP.
 *   6. Reset-password: validate the reset OTP and update the password hash.
 *
 * Data flow:
 *   Controller (HTTP validation) → **this file** (business rules + Prisma) → DB
 *   This file also calls lib/email.ts to dispatch OTP emails and lib/otp.ts
 *   to generate codes + expiry timestamps.
 *
 * Error classes exported from here are caught by the controller to map to
 * the correct HTTP status code.
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { generateOtp, otpExpiresAt, OTP_EXPIRY_MINUTES } from "../lib/otp";
import { sendSignupOtpEmail, sendResetOtpEmail } from "../lib/email";

// ---------------------------------------------------------------------------
// Custom error classes — the controller catches these to set status codes.
// ---------------------------------------------------------------------------

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BCRYPT_COST = 10; // matches seed.ts
const JWT_EXPIRES_IN = "7d";

/** Minimum seconds between OTP resend requests to prevent spam. */
const RESEND_COOLDOWN_SECONDS = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: "learner" | "instructor" | "admin";
  location?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

/** User object safe to return in API responses (no passwordHash). */
export type SafeUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

// ---------------------------------------------------------------------------
// 1. Register — creates an unverified account and emails a signup OTP.
// ---------------------------------------------------------------------------

/**
 * Create a new user with isVerified = false, generate a signup OTP,
 * store it in the DB, and send it to the user's email address.
 *
 * @returns The safe user object (id, name, email, role).
 */
export async function registerUser(input: RegisterInput): Promise<SafeUser> {
  // Check for duplicate email before doing any work.
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new ConflictError("Email already in use");
  }

  // Hash password with bcrypt (cost=10).
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  // Generate a 6-digit signup OTP and its 10-minute expiry.
  const otp = generateOtp();
  const expires = otpExpiresAt();

  // Insert the user row — isVerified defaults to false in the schema.
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      location: input.location?.trim() || null,
      signupOtp: otp,
      signupOtpExpires: expires,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  // Send the OTP email asynchronously — fire-and-forget so the HTTP
  // response is not delayed by SMTP latency. Failures are logged.
  sendSignupOtpEmail(input.email, input.name, otp);

  return user;
}

// ---------------------------------------------------------------------------
// 2. Verify signup OTP — activates the account.
// ---------------------------------------------------------------------------

/**
 * Check the signup OTP for the given email. If valid and not expired,
 * mark the account as verified and clear the OTP fields.
 */
export async function verifySignupOtp(
  email: string,
  otp: string
): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ValidationError("No account found with this email");
  }

  if (user.isVerified) {
    throw new ValidationError("Account is already verified");
  }

  // Check the OTP matches.
  if (!user.signupOtp || user.signupOtp !== otp) {
    throw new ValidationError("Invalid OTP code");
  }

  // Check expiry.
  if (!user.signupOtpExpires || user.signupOtpExpires < new Date()) {
    throw new ValidationError(
      "OTP has expired. Please request a new one."
    );
  }

  // Mark verified and clear OTP fields.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      signupOtp: null,
      signupOtpExpires: null,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// 3. Resend signup OTP — regenerates code and re-sends the email.
// ---------------------------------------------------------------------------

/**
 * Generate a fresh signup OTP for an unverified account and email it.
 * Enforces a cooldown (RESEND_COOLDOWN_SECONDS) to prevent spam.
 */
export async function resendSignupOtp(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Don't reveal whether the email exists — just return silently.
    return;
  }

  if (user.isVerified) {
    throw new ValidationError("Account is already verified");
  }

  // Cooldown check: if the current OTP was generated less than
  // RESEND_COOLDOWN_SECONDS ago, reject to prevent spam.
  if (user.signupOtpExpires) {
    const generatedAt =
      user.signupOtpExpires.getTime() - OTP_EXPIRY_MINUTES * 60 * 1000;
    const elapsed = (Date.now() - generatedAt) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
      throw new ValidationError(
        `Please wait ${wait} seconds before requesting a new code`
      );
    }
  }

  // Generate new OTP + expiry.
  const otp = generateOtp();
  const expires = otpExpiresAt();

  await prisma.user.update({
    where: { id: user.id },
    data: { signupOtp: otp, signupOtpExpires: expires },
  });

  // Send the email.
  sendSignupOtpEmail(email, user.name, otp);
}

// ---------------------------------------------------------------------------
// 4. Login — validates credentials and blocks unverified accounts.
// ---------------------------------------------------------------------------

/**
 * Authenticate a user by email + password. Returns a JWT token and safe
 * user object. Throws if:
 *   - credentials are wrong (generic message, doesn't leak which part)
 *   - account is not yet verified (separate clear message)
 */
export async function loginUser(
  input: LoginInput
): Promise<{ token: string; user: SafeUser }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same error for "not found" and "wrong password" — don't leak existence.
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // Block login if the account has not been email-verified.
  if (!user.isVerified) {
    throw new ForbiddenError(
      "Please verify your email before logging in. Check your inbox for the OTP."
    );
  }

  // Issue JWT with user id + role in the payload.
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. Forgot password — generates and emails a reset OTP.
// ---------------------------------------------------------------------------

/**
 * Look up the user by email, generate a reset OTP, store it, and send it.
 * Returns void regardless of whether the email exists (security: don't
 * reveal account existence to an attacker).
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Silently return — don't reveal that the email isn't registered.
    return;
  }

  // Cooldown guard (same logic as resend).
  if (user.resetOtpExpires) {
    const generatedAt =
      user.resetOtpExpires.getTime() - OTP_EXPIRY_MINUTES * 60 * 1000;
    const elapsed = (Date.now() - generatedAt) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
      throw new ValidationError(
        `Please wait ${wait} seconds before requesting a new code`
      );
    }
  }

  const otp = generateOtp();
  const expires = otpExpiresAt();

  await prisma.user.update({
    where: { id: user.id },
    data: { resetOtp: otp, resetOtpExpires: expires },
  });

  sendResetOtpEmail(email, user.name, otp);
}

// ---------------------------------------------------------------------------
// 6. Reset password — validates reset OTP and updates the password.
// ---------------------------------------------------------------------------

/**
 * Verify the reset OTP for the given email, then update the password hash.
 * Clears the reset OTP fields on success so the code can't be reused.
 */
export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ValidationError("No account found with this email");
  }

  // Validate OTP.
  if (!user.resetOtp || user.resetOtp !== otp) {
    throw new ValidationError("Invalid OTP code");
  }

  // Check expiry.
  if (!user.resetOtpExpires || user.resetOtpExpires < new Date()) {
    throw new ValidationError(
      "OTP has expired. Please request a new one."
    );
  }

  // Hash the new password and update.
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetOtp: null,
      resetOtpExpires: null,
    },
  });
}
