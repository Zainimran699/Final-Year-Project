/**
 * Reset Password page — step 2 of the password reset flow.
 *
 * Phase-20 redesign: uses the shared AuthLayout split-layout and Button
 * primitive. State machine + validation rules preserved byte-for-byte.
 *
 * The user arrives here from /forgot-password with their email in the query
 * string. They enter the 6-digit OTP from their email plus a new password
 * (with confirmation). On success they are redirected to /login.
 *
 * API call:
 *   POST /api/auth/reset-password  { email, otp, newPassword, confirmPassword }
 *
 * Navigation:
 *   Forgot Password → /reset-password?email=xxx → (success) → /login
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import AuthLayout from "../components/ui/AuthLayout";
import Button from "../components/ui/Button";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill email from query string.
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // --- Frontend validation ---
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!otp.trim()) {
      setError("Please enter the 6-digit code");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message: string }>(
        "/api/auth/reset-password",
        {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
          confirmPassword,
        }
      );
      setSuccess(res.data.message);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Password reset failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      badge="Choose a new password"
      title="Reset your password"
      subtitle="Enter your reset code and pick a new password for your account."
      footer={
        <>
          Back to{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="reset-email"
          >
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
            autoComplete="email"
          />
        </div>

        {/* OTP */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="reset-otp"
          >
            Reset code
          </label>
          <input
            id="reset-otp"
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

        {/* New password with toggle */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="new-password"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-11 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Confirm password — hidden/visible follows the toggle above */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="confirm-password"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
            autoComplete="new-password"
          />
        </div>

        {/* Error / success */}
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
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
