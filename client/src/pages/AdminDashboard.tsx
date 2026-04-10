import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

// Same card shape as the other dashboards. Admin scope is narrower:
// content moderation (theory + hazard question CRUD). Stats, user
// management, etc. are already exposed by /api/admin/* on the backend
// and will hang off this dashboard in a later phase.
function ActionCard({
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

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 mt-1">Manage platform content</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <ActionCard
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
            title="Theory Questions"
            description="Create, edit, or remove multiple-choice theory questions."
            buttonLabel="Manage Theory"
            buttonClass="bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate("/admin/questions")}
          />

          <ActionCard
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
            title="Hazard Questions"
            description="Create, edit, or remove hazard-perception scenarios."
            buttonLabel="Manage Hazard"
            buttonClass="bg-amber-500 hover:bg-amber-600"
            onClick={() => navigate("/admin/hazard")}
          />

          <ActionCard
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
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            }
            title="Learners"
            description="View registered learners and their test results."
            buttonLabel="View Learners"
            buttonClass="bg-green-600 hover:bg-green-700"
            onClick={() => navigate("/admin/learners")}
          />
        </div>
      </div>
    </div>
  );
}
