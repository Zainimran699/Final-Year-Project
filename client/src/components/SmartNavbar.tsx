import { useAuth } from "../context/useAuth";
import Navbar from "./Navbar";
import PublicNavbar from "./PublicNavbar";

// Renders the authenticated Navbar if the user is logged in,
// or the PublicNavbar (with Sign In / Register buttons) if not.
// Used on pages that are accessible to both guests and logged-in users
// (landing, FAQ, contact) so logged-in users stay logged in and see
// their role-specific nav links.
export default function SmartNavbar() {
  const { user } = useAuth();
  return user ? <Navbar /> : <PublicNavbar />;
}
