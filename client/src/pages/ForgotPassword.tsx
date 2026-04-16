/**
 * Forgot Password page — step 1 of the password reset flow.
 *
 * Phase-20 redesign: wrapped in the shared AuthLayout split-layout so the
 * whole reset flow (forgot → reset) visually matches Login/Register.
 * State machine unchanged.
 *
 * The user enters their email and clicks "Send Reset Code". The backend
 * generates a reset OTP and emails it. On success, the page redirects
 * to /reset-password?email=xxx where the user enters the OTP + new password.
 *
 * API call:
 *   POST /api/auth/forgot-password  { email }
 *
 * Navigation:
 *   Login → /forgot-password → (success) → /reset-password?email=xxx
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import AuthLayout from "../components/ui/AuthLayout";
import Button from "../components/ui/Button";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      // Always redirect — the backend returns 200 even if the email isn't
      // registered (security: don't reveal account existence).
      navigate(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      badge="Password reset"
      title="Forgot your password?"
      subtitle="No problem. Enter the email on your account and we'll send a 6-digit reset code."
      footer={
        <>
          Remember it after all?{" "}
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
        {/* Email field */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="forgot-email"
          >
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
            autoComplete="email"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          fullWidth
          loading={loading}
        >
          {loading ? "Sending..." : "Send reset code"}
        </Button>
      </form>
    </AuthLayout>
  );
}
