import { Link, useLocation } from "react-router-dom";

// Navbar for public pages (landing, FAQ, contact, login, register).
// Mirrors the same visual style as the authenticated Navbar but shows
// public navigation links + Login/Register CTAs instead of role links.
export default function PublicNavbar() {
  const { pathname } = useLocation();

  // Active link detection — same logic as the authenticated Navbar.
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
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
        {/* Brand with logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="DriveReady221" className="h-8 w-8 rounded" />
          <span className="text-xl font-bold text-blue-600">DriveReady221</span>
        </Link>

        {/* Navigation links + auth buttons */}
        <nav className="flex items-center gap-6">
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

          {/* Auth action buttons */}
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
      </div>
    </header>
  );
}
