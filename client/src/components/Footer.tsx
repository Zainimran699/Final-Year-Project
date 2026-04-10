import { Link } from "react-router-dom";

// Shared footer displayed on public pages (landing, contact, FAQ)
// and optionally reusable on authenticated pages.
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand & tagline */}
          <div>
            <p className="text-xl font-bold text-white mb-2">DriveReady221</p>
            <p className="text-sm text-gray-400">
              Your all-in-one UK driving theory &amp; hazard perception training
              platform. Learn, practise, and book lessons — all in one place.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="font-semibold text-white mb-3">Quick Links</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <p className="font-semibold text-white mb-3">Get In Touch</p>
            <ul className="space-y-2 text-sm">
              <li>Email: support@driveready221.co.uk</li>
              <li>Phone: +44 161 123 4567</li>
              <li>Manchester, United Kingdom</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} DriveReady221. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
