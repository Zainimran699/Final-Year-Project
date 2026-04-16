/**
 * AuthLayout — premium split-layout shell used by every auth page.
 *
 * Layout:
 *   - lg+ screens: two columns. Left (5/12) is a branded gradient panel
 *     with the DriveReady221 story + feature highlights. Right (7/12) is
 *     the actual form card, vertically centred.
 *   - <lg screens: left panel is hidden, right panel spans full width
 *     and gets a minimal top bar with just the logo + Home link.
 *
 * Why split layout instead of the previous centred card:
 *   The old auth pages (Login, Register, etc.) used a 450px card floating
 *   on a gray background with SmartNavbar on top. Functional but plain —
 *   the user's brief called for a "premium split-layout authentication
 *   experience" inspired by modern SaaS products. This component is the
 *   single place that design lives.
 *
 * Motion:
 *   - Left panel fades + slides in from the left on mount
 *   - Right panel (form side) fades + slides in from the right
 *   - Feature bullets stagger in
 *   All honour `prefers-reduced-motion` via framer-motion defaults.
 *
 * Props:
 *   - title      : big heading displayed above the form (e.g. "Welcome back")
 *   - subtitle   : subtler line under the title
 *   - badge      : optional small pill over the title ("Sign in", "New account")
 *   - footer     : slot below the form card (e.g. the "Don't have an account?" link)
 *   - children   : the form itself
 *
 * Used by:
 *   Login, Register, VerifyOtp, ForgotPassword, ResetPassword
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  footer?: ReactNode;
  children: ReactNode;
};

// Feature highlights shown on the left branding panel. Kept in one place
// so a copy tweak doesn't require editing five pages.
const FEATURE_HIGHLIGHTS: Array<{
  title: string;
  body: string;
  icon: ReactNode;
}> = [
  {
    title: "UK Theory Practice",
    body: "Timed multiple-choice tests across road signs, speed limits, safety, and motorway rules.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: "AI-Powered Explanations",
    body: "Get a friendly breakdown of any wrong answer — cached so you never wait twice.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.814a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    title: "Hazard Perception Training",
    body: "Real driving scenes with developing-hazard questions modelled on the DVSA format.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    title: "Instructor Marketplace",
    body: "Browse local instructors, view their availability, and book a lesson in one click.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
];

export default function AuthLayout({
  title,
  subtitle,
  badge,
  footer,
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* LEFT — branded panel (hidden on mobile / small tablets) */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="hidden lg:flex lg:flex-col lg:w-5/12 xl:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 text-white px-10 py-12"
      >
        {/* Decorative blobs — soft glows to give the panel depth */}
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-purple-400/20 blur-3xl"
        />

        {/* Brand row */}
        <Link to="/" className="relative z-10 flex items-center gap-2 w-fit">
          <img src="/logo.png" alt="DriveReady221" className="h-9 w-9 rounded-lg" />
          <span className="text-xl font-bold tracking-tight">DriveReady221</span>
        </Link>

        {/* Panel headline */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-3xl xl:text-4xl font-bold leading-tight mb-3"
          >
            Your complete UK driving theory platform.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-blue-100/90 text-base mb-10"
          >
            Practise theory, train your hazard perception, and book lessons
            with qualified local instructors — all in one place.
          </motion.p>

          {/* Feature highlights — staggered entry */}
          <div className="space-y-4">
            {FEATURE_HIGHLIGHTS.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
                className="flex items-start gap-3"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm">{f.title}</p>
                  <p className="text-sm text-blue-100/80 leading-snug">
                    {f.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer tagline */}
        <p className="relative z-10 text-sm text-blue-100/70">
          Final-year project by Zain Imran — University of Salford
        </p>
      </motion.aside>

      {/* RIGHT — form column */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile-only top bar — shows the brand + a back-to-home link */}
        <header className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="DriveReady221" className="h-8 w-8 rounded" />
            <span className="text-lg font-bold text-blue-600">
              DriveReady221
            </span>
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            Home
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            className="w-full max-w-md"
          >
            {/* Header block */}
            <div className="mb-6">
              {badge && (
                <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-3">
                  {badge}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-500 mt-2 text-sm sm:text-base">
                  {subtitle}
                </p>
              )}
            </div>

            {/* The form card itself */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              {children}
            </div>

            {/* Optional footer slot — e.g. "Already have an account?" link */}
            {footer && (
              <div className="mt-6 text-center text-sm text-gray-600">
                {footer}
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
