/**
 * Email sending utility — uses Nodemailer to dispatch OTP emails.
 *
 * Configuration comes from environment variables (see server/.env.example):
 *   SMTP_HOST  — SMTP server hostname (e.g. smtp.gmail.com)
 *   SMTP_PORT  — SMTP port (587 for TLS, 465 for SSL)
 *   SMTP_USER  — SMTP login (often your email address)
 *   SMTP_PASS  — SMTP password / app-specific password
 *   SMTP_FROM  — "From" address shown to the recipient
 *
 * If SMTP_HOST is not set, emails are logged to the console instead of
 * being sent. This lets the dev server work without SMTP credentials —
 * the OTP still appears in the terminal output so you can copy it.
 *
 * Called by:
 *   - auth.service.ts → registerUser()      → sendSignupOtpEmail()
 *   - auth.service.ts → resendSignupOtp()   → sendSignupOtpEmail()
 *   - auth.service.ts → forgotPassword()    → sendResetOtpEmail()
 */

import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Transporter — created once, reused for every send.
// ---------------------------------------------------------------------------

/**
 * Build the Nodemailer transporter from env vars.
 * Returns null if SMTP is not configured (dev/demo fallback).
 */
function createTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.warn(
      "[email] SMTP_HOST not set — emails will be logged to console only."
    );
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465, // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const transporter = createTransporter();

/** The sender address for all outbound emails. */
const FROM = process.env.SMTP_FROM ?? "DriveReady221 <noreply@driveready221.co.uk>";

// ---------------------------------------------------------------------------
// Public email functions
// ---------------------------------------------------------------------------

/**
 * Send the signup-verification OTP to a newly registered user.
 *
 * @param to    — recipient email address
 * @param name  — user's display name (for the greeting)
 * @param otp   — the 6-digit OTP code
 */
export async function sendSignupOtpEmail(
  to: string,
  name: string,
  otp: string
): Promise<void> {
  const subject = "DriveReady221 — Verify your email";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to DriveReady221!</h2>
      <p>Hi ${name},</p>
      <p>Thanks for signing up. Enter the code below to verify your email address:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px;
                      background: #f1f5f9; padding: 12px 24px; border-radius: 8px;">
          ${otp}
        </span>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        This code expires in <strong>10 minutes</strong>. If you didn't create
        an account, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">DriveReady221 — UK Driving Theory Training</p>
    </div>
  `;

  await dispatchEmail(to, subject, html);
}

/**
 * Send the password-reset OTP to an existing user.
 *
 * @param to    — recipient email address
 * @param name  — user's display name
 * @param otp   — the 6-digit OTP code
 */
export async function sendResetOtpEmail(
  to: string,
  name: string,
  otp: string
): Promise<void> {
  const subject = "DriveReady221 — Reset your password";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Password Reset</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Use the code below:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px;
                      background: #f1f5f9; padding: 12px 24px; border-radius: 8px;">
          ${otp}
        </span>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        This code expires in <strong>10 minutes</strong>. If you didn't request
        a password reset, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">DriveReady221 — UK Driving Theory Training</p>
    </div>
  `;

  await dispatchEmail(to, subject, html);
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/**
 * Send an email via SMTP, or log it to console if SMTP is not configured.
 * Never throws — a failed send is logged but does not crash the request.
 */
async function dispatchEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!transporter) {
    // Dev fallback: print to terminal so the developer can grab the OTP.
    console.log(`\n📧 [EMAIL → ${to}]\n   Subject: ${subject}\n   Body (text): ${html.replace(/<[^>]*>/g, "").trim()}\n`);
    return;
  }

  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`[email] sent "${subject}" to ${to}`);
  } catch (err) {
    // Log but don't throw — the user already got a success response for the
    // registration/reset request. The OTP is stored in the DB so a resend
    // will try again.
    console.error(`[email] failed to send to ${to}:`, err);
  }
}
