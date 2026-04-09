import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { dashboardPathForRole } from "../types";
import type { Role } from "../types";

// Role-scoped route guard. If the current user doesn't have the required
// role, bounce them to their OWN role's dashboard — NOT a hardcoded
// /dashboard, which would cause an infinite loop for instructors/admins
// (the learner dashboard is itself wrapped in RequireRole role="learner").
export default function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  if (!user) {
    // RequireAuth should catch this upstream, but handle it defensively.
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }
  return <Outlet />;
}
