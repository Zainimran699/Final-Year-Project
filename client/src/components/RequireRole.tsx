import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

// Route guard for role-specific sections (instructor-only, admin-only, etc.).
// Unused in Phase 13 — reserved for later phases that add protected pages.
export default function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  if (user?.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
