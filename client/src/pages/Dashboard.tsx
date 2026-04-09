import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // RequireAuth guards this route, but narrow for TypeScript.
  if (!user) return null;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">Welcome, {user.name}</h1>
        <p className="text-gray-700 mb-1">Email: {user.email}</p>
        <p className="text-gray-700 mb-4">Role: {user.role}</p>

        {user.role === "learner" && (
          <div className="mb-4">
            <Link
              to="/theory"
              className="inline-block bg-blue-600 text-white rounded px-4 py-2"
            >
              Start theory practice
            </Link>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="bg-gray-800 text-white rounded px-4 py-2"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
