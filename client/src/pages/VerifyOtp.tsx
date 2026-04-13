/**
 * Verify OTP page — entered after registration.
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
import SmartNavbar from "../components/SmartNavbar";
import Footer from "../components/Footer";

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SmartNavbar />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-gray-100 p-8">
          {/* Heading */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Verify your email
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              Enter the 6-digit code we sent to your inbox
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {/* Email field */}
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
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
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoComplete="email"
              />
            </div>

            {/* OTP field */}
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="otp"
              >
                Verification Code
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
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center tracking-[0.3em] text-lg font-mono"
                autoComplete="one-time-code"
              />
            </div>

            {/* Error / success messages */}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            {/* Verify button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          {/* Resend + back to login links */}
          <div className="mt-6 space-y-3 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              {resending ? "Sending..." : "Didn\u2019t receive the code? Resend"}
            </button>
            <p className="text-sm text-gray-600">
              Already verified?{" "}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
