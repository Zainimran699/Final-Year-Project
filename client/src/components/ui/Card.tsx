/**
 * Card — the shared card shell used across the redesigned DriveReady221 UI.
 *
 * Before Phase-20 every page repeated the class string
 *   "bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
 * which quickly drifted out of sync (some pages used shadow-md, some p-5,
 * some forgot the border). This component centralises that token.
 *
 * Variants:
 *   - default    : the standard white card (most common)
 *   - elevated   : heavier shadow, used for the "hero" card on a page
 *                  (e.g. the AI assistant drawer inner sections)
 *   - glass      : semi-transparent with backdrop-blur, used on the
 *                  gradient auth panels so the card doesn't fight the bg
 *   - highlight  : subtle gradient tint, used for AI-generated output
 *                  cards so they visually signal "AI content, review me"
 *
 * Animation:
 *   Wrapping in motion.div so callers can pass `initial`, `animate`,
 *   `whileHover` etc. via the `motionProps` prop without us re-exporting
 *   every framer-motion prop shape.
 *
 * Used by:
 *   - every redesigned page (Landing, auth pages, dashboards, AI drawer)
 */

import { motion } from "framer-motion";
import type { HTMLMotionProps, MotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "default" | "elevated" | "glass" | "highlight";

// We extend framer-motion's HTMLMotionProps<"div"> (not React's
// HTMLAttributes). motion.div overrides the DOM drag handlers with
// pan-gesture ones (PanInfo), so mixing the two causes TS2322 clashes.
// `children` is narrowed to ReactNode because HTMLMotionProps widens it
// to include MotionValues, which we never render.
type CardProps = Omit<HTMLMotionProps<"div">, "ref" | "children"> & {
  variant?: Variant;
  hover?: boolean;
  as?: "div" | "section" | "article";
  children?: ReactNode;
  /** Pass framer-motion props (initial / animate / transition etc) if you need entry motion */
  motionProps?: MotionProps;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  default:
    "bg-white rounded-2xl shadow-sm border border-gray-100",
  elevated:
    "bg-white rounded-2xl shadow-lg border border-gray-100",
  glass:
    "bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white",
  highlight:
    "bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl shadow-sm border border-indigo-100",
};

export default function Card({
  variant = "default",
  hover = false,
  className = "",
  children,
  motionProps,
  ...rest
}: CardProps) {
  const hoverClass = hover
    ? "transition-all hover:shadow-md hover:-translate-y-0.5"
    : "";

  return (
    <motion.div
      {...motionProps}
      {...rest}
      className={`${VARIANT_CLASSES[variant]} ${hoverClass} ${className}`}
    >
      {children}
    </motion.div>
  );
}
