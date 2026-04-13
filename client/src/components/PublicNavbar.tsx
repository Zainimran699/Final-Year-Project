/**
 * PublicNavbar — navigation bar for unauthenticated (guest) users.
 *
 * Shows: Home, FAQ, Contact Us links + Sign In / Register CTAs.
 * Mirrors the visual style of the authenticated Navbar.
 *
 * Responsive: on mobile (<md) the nav links collapse behind a hamburger
 * toggle. The toggle renders a vertical menu below the header bar.
 *
 * Used by SmartNavbar when the user is NOT logged in.
 */

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function PublicNavbar() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const links = [
    { label: "Home", href: "/" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact Us", href: "/contact" },
  ];

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand with logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.png" alt="DriveReady221" className="h-8 w-8 rounded" />
          <span className="text-lg sm:text-xl font-bold text-blue-600">DriveReady221</span>
        </Link>

        {/* Desktop navigation (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => {
            const active = isActive(link.href);
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
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Register
          </Link>
        </nav>

        {/* Mobile hamburger button (visible on mobile only) */}
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

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-2 px-3 rounded-lg text-sm font-medium ${
                isActive(link.href)
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block text-center py-2 px-3 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Register
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
