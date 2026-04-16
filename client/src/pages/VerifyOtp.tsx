/**
 * Verify OTP page — entered after registration.
 *
 * Phase-20 redesign: switched to the shared AuthLayout split-layout +
 * Button primitive. State machine preserved byte-for-byte.
 *
 * The user arrives here with their email (from query string or navigation
 * state). They enter the 6-digit OTP they received via email. On success
 * they are redirected to /login with a success message.
 *
 * API calls:
 *   POST /api/auth/verify-signup  { email, otp }         → verifies account
 *   POST /api/auth/resend-signup  { email }               → resends OTP
 *
 * Navigation:
 *   Register page → /verify-otp?email=xxx → (success) → /login
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import AuthLayout from "../components/ui/AuthLayout";
import Button from "../components/ui/Button";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill email from the query string (?email=...) set by the Register page.
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // ----- Verify OTP submission -----
  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!otp.trim()) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message: string }>(
        "/api/auth/verify-signup",
        { email: email.trim().toLowerCase(), otp: otp.trim() }
      );
      setSuccess(res.data.message);
      // Redirect to login after a short delay so the user sees the success.
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Verification failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ----- Resend OTP -----
  async function handleResend() {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Please enter your email address first");
      return;
    }

    setResending(true);
    try {
      const res = await api.post<{ message: string }>(
        "/api/auth/resend-signup",
        { email: email.trim().toLowerCase() }
      );
      setSuccess(res.data.message);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to resend code";
      setError(message);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      badge="Verify email"
      title="Check your inbox"
      subtitle="Enter the 6-digit code we just sent to verify your email address."
      footer={
        <>
          Already verified?{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleVerify} className="space-y-4">
        {/* Email field */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="verify-email"
          >
            Email
          </label>
          <input
            id="verify-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
            autoComplete="email"
          />
        </div>

        {/* OTP field — monospace + wide letter-spacing keeps the 6 digits
            readable. Only accepts numeric input (stripped on change). */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="otp"
          >
            Verification code
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center tracking-[0.4em] text-xl font-mono transition-colors"
            autoComplete="one-time-code"
          />
        </div>

        {/* Error / success messages */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          fullWidth
          loading={loading}
        >
          {loading ? "Verifying..." : "Verify email"}
        </Button>
      </form>

      {/* Resend link */}
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          {resending ? "Sending..." : "Didn\u2019t receive the code? Resend"}
        </button>
      </div>
    </AuthLayout>
  );
}
