import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/useAuth";

// One feature card on the learner home. Extracted as a tiny inline
// component so the four cards below stay readable and we don't copy-paste
// the card shell four times.
function FeatureCard({
  icon,
  iconBg,
  title,
  description,
  buttonLabel,
  buttonClass,
  onClick,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonClass: string;
  onClick: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className={`${iconBg} rounded-full p-3 inline-block w-fit`}>
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`${buttonClass} text-white font-medium px-4 py-2.5 rounded-lg transition-colors mt-auto self-start`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // RequireAuth guards this route, but narrow for TypeScript.
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.name}
          </h1>
          <p className="text-gray-500 mt-1">
            What would you like to practise today?
          </p>
        </div>

        {/* 2x2 grid of feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FeatureCard
            iconBg="bg-blue-100"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-6 h-6 text-blue-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            }
            title="Theory Practice Test"
            description="Answer 10 multiple-choice questions and receive AI-powered explanations for every answer."
            buttonLabel="Start Theory Test"
            buttonClass="bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate("/theory")}
          />

          <FeatureCard
            iconBg="bg-amber-100"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-6 h-6 text-amber-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            }
            title="Hazard Perception"
            description="Study real driving scenes and identify developing hazards from four answer options."
            buttonLabel="Start Hazard Test"
            buttonClass="bg-amber-500 hover:bg-amber-600"
            onClick={() => navigate("/hazard")}
          />

          <FeatureCard
            iconBg="bg-green-100"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-6 h-6 text-green-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            }
            title="Find an Instructor"
            description="Browse qualified driving instructors near you and book a lesson at a time that suits you."
            buttonLabel="Search Instructors"
            buttonClass="bg-green-600 hover:bg-green-700"
            onClick={() => navigate("/instructors")}
          />

          <FeatureCard
            iconBg="bg-purple-100"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-6 h-6 text-purple-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            }
            title="My Progress"
            description="Review your past theory and hazard test scores and track your improvement over time."
            buttonLabel="View My Results"
            buttonClass="bg-purple-600 hover:bg-purple-700"
            onClick={() => navigate("/progress")}
          />
        </div>
      </div>
    </div>
  );
}
