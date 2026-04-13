/**
 * OTP generation utility.
 *
 * Generates a cryptographically random 6-digit numeric code using Node's
 * built-in crypto module. The code is zero-padded so it always has exactly
 * 6 digits (e.g. "004821").
 *
 * Used by:
 *   - auth.service.ts → registerUser()      (signup OTP)
 *   - auth.service.ts → resendSignupOtp()   (re-generate signup OTP)
 *   - auth.service.ts → forgotPassword()    (reset OTP)
 *
 * OTP lifetime is controlled by OTP_EXPIRY_MINUTES (default 10 min).
 */

import crypto from "crypto";

/** How long an OTP stays valid, in minutes. */
export const OTP_EXPIRY_MINUTES = 10;

/**
 * Generate a 6-digit random numeric OTP.
 *
 * Uses crypto.randomInt (CSPRNG) instead of Math.random to avoid
 * predictable sequences.
 */
export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Calculate the expiry timestamp for an OTP generated right now.
 * Returns a Date that is OTP_EXPIRY_MINUTES in the future.
 */
export function otpExpiresAt(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}
