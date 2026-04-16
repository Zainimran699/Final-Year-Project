/**
 * Login page — email + password authentication.
 *
 * Phase-20 redesign:
 *   - Drops the centred card-on-gray-background shell in favour of the
 *     shared AuthLayout split-layout (branded gradient panel on the left,
 *     form card on the right). See [AuthLayout.tsx] for rationale.
 *   - Uses the shared Button primitive instead of hand-rolled classes so
 *     the CTA gets motion + loading state for free.
 *   - State machine is preserved byte-for-byte from the pre-redesign file —
 *     only the JSX changes. The auth flow (NOT_VERIFIED redirect, role-
 *     aware post-login navigation, already-logged-in guard) is untouched.
 *
 * Features:
 *   - Password show/hide toggle
 *   - Back-button guard: redirects already-logged-in users to their dashboard
 *   - "Forgot Password?" link → /forgot-password
 *   - Handles NOT_VERIFIED (403) by redirecting to /verify-otp
 *
 * API call:
 *   POST /api/auth/login  { email, password }
 *   → on success: stores JWT + user in AuthContext, navigates to dashboard
 *   → on 403 NOT_VERIFIED: redirects to /verify-otp?email=xxx
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { dashboardPathForRole } from "../types";
import AuthLayout from "../components/ui/AuthLayout";
import Button from "../components/ui/Button";

export default function Login() {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Back-button fix: if the user is already logged in, redirect to their
  // dashboard. Uses <Navigate> (not navigate()) because calling navigate()
  // during render is a side-effect that produces a blank page.
  if (user) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Frontend validation.
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    try {
      // login() returns the authed user so we can route by role on the
      // same tick without racing the setState commit.
      const u = await login(email.trim().toLowerCase(), password);
      navigate(dashboardPathForRole(u.role));
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { error?: string; code?: string } } })?.response;

      // If the backend returns 403 with code "NOT_VERIFIED", redirect the
      // user to the OTP verification page instead of showing a generic error.
      if (resp?.status === 403 && resp.data?.code === "NOT_VERIFIED") {
        navigate(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }

      const message = resp?.data?.error ?? "Login failed";
      setError(message);
    }
  }

  return (
    <AuthLayout
      badge="Sign in"
      title="Welcome back"
      subtitle="Sign in to continue your UK driving test prep."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email field */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
            autoComplete="email"
          />
        </div>

        {/* Password field with show/hide toggle + forgot-password link */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="password"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-11 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
              autoComplete="current-password"
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

        {/* Inline error — red pill for visual consistency with Toast */}
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
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
