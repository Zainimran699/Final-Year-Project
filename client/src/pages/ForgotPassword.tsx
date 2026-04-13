/**
 * Forgot Password page — step 1 of the password reset flow.
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
import SmartNavbar from "../components/SmartNavbar";
import Footer from "../components/Footer";

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SmartNavbar />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-gray-100 p-8">
          {/* Heading */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-amber-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Forgot password?
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              Enter your email and we&apos;ll send you a reset code
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
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
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoComplete="email"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-6 text-center">
            Remember your password?{" "}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
