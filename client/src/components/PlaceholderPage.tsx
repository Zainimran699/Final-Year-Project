import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { dashboardPathForRole } from "../types";

// Shared "coming soon" page body for routes that exist in the router but
// whose real UI hasn't been built yet. A later phase replaces each wrapper
// with the real implementation — this component stays untouched.
export default function PlaceholderPage({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Back button returns to the caller's OWN role dashboard, not a
  // hardcoded path — so an admin hitting a placeholder goes back to
  // /admin/dashboard, not /dashboard.
  const backPath = user ? dashboardPathForRole(user.role) : "/dashboard";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 mb-8">{subtitle}</p>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-400 text-lg mb-6">
            This section is coming soon.
          </p>
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
