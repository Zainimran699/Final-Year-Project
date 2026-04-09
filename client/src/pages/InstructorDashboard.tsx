import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

// Same card shape as the learner dashboard, but scoped to instructor
// actions. Not a placeholder — this is the real instructor home.
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

export default function InstructorDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Instructor Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your profile, availability, and upcoming bookings
          </p>
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
                  d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            title="My Profile"
            description="Update your bio, hourly rate, and the area you cover."
            buttonLabel="Edit Profile"
            buttonClass="bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate("/instructor/profile")}
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
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            }
            title="Manage Availability"
            description="Add or remove the time slots learners can book with you."
            buttonLabel="Manage Slots"
            buttonClass="bg-green-600 hover:bg-green-700"
            onClick={() => navigate("/instructor/availability")}
          />

          <ActionCard
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
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                />
              </svg>
            }
            title="My Bookings"
            description="See upcoming and past lessons booked by learners."
            buttonLabel="View Bookings"
            buttonClass="bg-purple-600 hover:bg-purple-700"
            onClick={() => navigate("/instructor/bookings")}
          />
        </div>
      </div>
    </div>
  );
}
