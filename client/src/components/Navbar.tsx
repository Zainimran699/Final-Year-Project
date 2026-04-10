import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { Role } from "../types";

// Single nav-link entry. `href` must match the route path in App.tsx exactly.
type NavItem = { label: string; href: string };

// Each role sees a curated set of links. Keep this in sync with the route
// tree in App.tsx — if you add a route, add it here too (or it won't be
// reachable from the navbar).
const LINKS_BY_ROLE: Record<Role, NavItem[]> = {
  learner: [
    { label: "Theory Test", href: "/theory" },
    { label: "Hazard Test", href: "/hazard" },
    { label: "Find Instructor", href: "/instructors" },
    { label: "My Progress", href: "/progress" },
    { label: "My Bookings", href: "/bookings" },
  ],
  instructor: [
    { label: "Dashboard", href: "/instructor/dashboard" },
    { label: "My Profile", href: "/instructor/profile" },
    { label: "Availability", href: "/instructor/availability" },
    { label: "Bookings", href: "/instructor/bookings" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Theory Questions", href: "/admin/questions" },
    { label: "Hazard Questions", href: "/admin/hazard" },
    { label: "Learners", href: "/admin/learners" },
  ],
};

// Active-link detection. `/dashboard` needs strict equality because a
// startsWith check would also match e.g. `/dashboard-foo` in the future.
// Every other link uses prefix matching so that nested routes like
// `/instructor/bookings/123` still highlight "Bookings".
function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Defensive — RequireAuth should already guard this, but a mid-logout
  // render can briefly have null user before the redirect commits.
  if (!user) return null;

  const links = LINKS_BY_ROLE[user.role];

  function handleLogout() {
    logout();
    // Hard client-side nav to /login. logout() clears state synchronously
    // so the next render of RequireAuth would already bounce us, but
    // navigating explicitly is cleaner and avoids a flash.
    navigate("/login");
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
        {/* Brand — links to the user's own home dashboard */}
        <Link
          to={
            user.role === "learner"
              ? "/dashboard"
              : user.role === "instructor"
                ? "/instructor/dashboard"
                : "/admin/dashboard"
          }
          className="text-xl font-bold text-blue-600"
        >
          DriveReady221
        </Link>

        {/* Right side: role-specific links + logout */}
        <nav className="flex items-center gap-6">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                to={link.href}
                className={
                  active
                    ? "text-blue-600 font-semibold border-b-2 border-blue-600 pb-1"
                    : "text-gray-600 hover:text-gray-900 font-medium pb-1 border-b-2 border-transparent"
                }
              >
                {link.label}
              </Link>
            );
          })}
          {/* Contact link — available to all authenticated users */}
          <Link
            to="/contact"
            className={
              isActive(pathname, "/contact")
                ? "text-blue-600 font-semibold border-b-2 border-blue-600 pb-1"
                : "text-gray-600 hover:text-gray-900 font-medium pb-1 border-b-2 border-transparent"
            }
          >
            Contact
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-red-500 hover:text-red-700 font-medium cursor-pointer"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
