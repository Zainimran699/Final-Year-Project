/**
 * Navbar — navigation bar for authenticated users.
 *
 * Shows role-specific links from LINKS_BY_ROLE plus a Contact link and
 * a Logout button. The brand/logo links to "/" (homepage).
 *
 * Responsive: on mobile (<md) the links collapse behind a hamburger toggle.
 *
 * Used by:
 *   - RequireAuth.tsx renders this above every private route's <Outlet />.
 *   - SmartNavbar.tsx renders this when the user IS logged in.
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { Role } from "../types";

type NavItem = { label: string; href: string };

// Each role sees a curated set of links. Keep this in sync with the route
// tree in App.tsx — if you add a route, add it here too.
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

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const links = LINKS_BY_ROLE[user.role];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Shared className generator for nav links.
  const linkClass = (href: string, mobile = false) => {
    const active = isActive(pathname, href);
    if (mobile) {
      return `block py-2 px-3 rounded-lg text-sm font-medium ${
        active ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:bg-gray-50"
      }`;
    }
    return active
      ? "text-blue-600 font-semibold border-b-2 border-blue-600 pb-1"
      : "text-gray-600 hover:text-gray-900 font-medium pb-1 border-b-2 border-transparent";
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.png" alt="DriveReady221" className="h-8 w-8 rounded" />
          <span className="text-lg sm:text-xl font-bold text-blue-600">DriveReady221</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6">
          {links.map((link) => (
            <Link key={link.href} to={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          <Link to="/contact" className={linkClass("/contact")}>
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

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className={linkClass(link.href, true)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/contact"
            onClick={() => setMenuOpen(false)}
            className={linkClass("/contact", true)}
          >
            Contact
          </Link>
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className="block w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
