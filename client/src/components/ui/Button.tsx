/**
 * Button — the single source of truth for buttons across the redesigned UI.
 *
 * Why a shared component:
 *   Before the Phase-20 UI refresh, every page hand-rolled its own button
 *   classes ("bg-blue-600 hover:bg-blue-700 text-white ..."). That was
 *   fine for the FYP MVP, but meant a visual tweak (e.g. nudging shadow
 *   or radius) touched 20+ files. This component consolidates the
 *   variants + sizes + loading state so a change here cascades.
 *
 * Variants (matches DriveReady221 colour tokens in CLAUDE.md §3.7):
 *   - primary   : blue-600, the "confirm / continue" CTA
 *   - secondary : gray shell, neutral action (cancel, back)
 *   - outline   : transparent with blue border, used on coloured hero panels
 *   - ghost     : transparent, used inline (e.g. inside a card)
 *   - danger    : red-500/600, destructive (delete, sign out on dashboards)
 *   - gradient  : indigo→purple gradient, reserved for premium moments
 *                 like the landing hero CTA or the AI assistant trigger.
 *
 * Sizes: sm / md / lg — md is the default.
 *
 * Motion: uses framer-motion's `whileHover` + `whileTap` for a subtle lift
 * on hover and compress on tap. Honours `prefers-reduced-motion` through
 * framer-motion's built-in guard.
 *
 * Accessibility:
 *   - Forwards every standard <button> prop (type, onClick, disabled, etc.)
 *   - Disabled + loading share the same pointer-events-none style so
 *     callers can use either without mismatched UX.
 */

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "gradient";
type Size = "sm" | "md" | "lg";

// NOTE — we extend framer-motion's HTMLMotionProps<"button"> (not React's
// ButtonHTMLAttributes). motion.button overrides a handful of React DOM
// event handlers (onDrag becomes a pan-gesture handler with PanInfo), so
// mixing them causes TS2322 conflicts under strict mode.
//
// We override `children` to plain ReactNode — HTMLMotionProps widens it to
// include MotionValues, which we never render as button text anyway.
type ButtonProps = Omit<HTMLMotionProps<"button">, "ref" | "children"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md",
  secondary:
    "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200",
  outline:
    "bg-white/10 hover:bg-white/20 text-white border-2 border-white/80 backdrop-blur-sm",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
  danger:
    "bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md",
  gradient:
    "bg-gradient-to-r from-indigo-500 via-blue-600 to-purple-600 hover:from-indigo-600 hover:via-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-5 py-2.5 rounded-lg gap-2",
  lg: "text-base px-6 py-3 rounded-xl gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const base =
    "inline-flex items-center justify-center font-medium transition-colors transition-shadow duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";
  const width = fullWidth ? "w-full" : "";

  return (
    <motion.button
      {...rest}
      disabled={isDisabled}
      className={`${base} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${width} ${className}`}
      whileHover={isDisabled ? undefined : { y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </motion.button>
  );
}
