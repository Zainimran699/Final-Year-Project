/**
 * Register page — creates a new user account.
 *
 * Phase-20 redesign:
 *   - Uses the shared AuthLayout split-layout (branded gradient panel on
 *     the left, form card on the right). Matches Login visually — both
 *     are auth pages and the user should feel they belong to one system.
 *   - Uses the shared Button primitive for the CTA.
 *   - State machine preserved byte-for-byte from the pre-redesign file
 *     (form fields, validation, register → /verify-otp redirect).
 *
 * After a successful registration the user is redirected to /verify-otp
 * where they enter the 6-digit code sent to their email. The account is
 * NOT active until the OTP is verified — there is no auto-login.
 *
 * All fields are mandatory (name, email, password, role). Location is
 * required for instructors (optional for learners).
 *
 * API call:
 *   POST /api/auth/register  { name, email, password, role, location }
 *   → 201: account created + signup OTP emailed → redirect to /verify-otp
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { dashboardPathForRole } from "../types";
import type { Role } from "../types";
import AuthLayout from "../components/ui/AuthLayout";
import Button from "../components/ui/Button";

export default function Register() {
  const { register, loading, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState("");
  const [role, setRole] = useState<Role>("learner");
  const [error, setError] = useState<string | null>(null);

  // If already logged in, bounce to dashboard.
  if (user) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // --- Frontend validation ---
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (role === "instructor" && !location.trim()) {
      setError("Location is required for instructors");
      return;
    }

    try {
      // register() no longer auto-logs in. It creates the account and
      // returns { email } so we can redirect to the OTP verification page.
      const result = await register(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        role,
        location.trim() || undefined
      );
      navigate(`/verify-otp?email=${encodeURIComponent(result.email)}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Registration failed";
      setError(message);
    }
  }

  return (
    <AuthLayout
      badge="New account"
      title="Create your account"
      subtitle="Start practising theory, hazard perception, and booking lessons."
      footer={
        <>
          Already have an account?{" "}
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
        {/* Role selector — visual pills instead of a native select. Keeps
            the choice obvious on the first screen the user sees. */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            I want to sign up as
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("learner")}
              className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                role === "learner"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="text-sm font-semibold">Learner</span>
              <span className="text-xs">Practise &amp; book</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("instructor")}
              className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                role === "instructor"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="text-sm font-semibold">Instructor</span>
              <span className="text-xs">Offer lessons</span>
            </button>
          </div>
        </div>

        {/* Name field */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="name"
          >
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
            autoComplete="name"
          />
        </div>

        {/* Email field */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="email"
          >
            Email <span className="text-red-500">*</span>
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

        {/* Password field with show/hide toggle */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="password"
          >
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        {/* Location — required for instructors, optional for learners.
            Stays visible for both roles so layout doesn't jump when the
            role pill is toggled. */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="location"
          >
            Location{" "}
            {role === "instructor" ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-gray-400 font-normal">(optional)</span>
            )}
          </label>
          <input
            id="location"
            type="text"
            required={role === "instructor"}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Manchester, M1 2AB"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
            autoComplete="address-level2"
          />
        </div>

        {/* Inline error */}
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
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-xs text-gray-400 text-center pt-1">
          We&apos;ll email you a 6-digit code to verify your address.
        </p>
      </form>
    </AuthLayout>
  );
}
