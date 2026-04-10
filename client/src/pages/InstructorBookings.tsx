import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import type { InstructorBookingRow } from "../types";

export default function InstructorBookings() {
  const [bookings, setBookings] = useState<InstructorBookingRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ bookings: InstructorBookingRow[] }>("/api/instructors/me/bookings")
      .then((res) => setBookings(res.data.bookings))
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Failed to load bookings";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  // Split into upcoming (confirmed) and past/cancelled.
  const upcoming = bookings?.filter((b) => b.status === "confirmed") ?? [];
  const past = bookings?.filter((b) => b.status !== "confirmed") ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-600 text-center mt-12">Loading bookings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-red-600 text-center mt-12">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-gray-500 mt-1">
              Upcoming and past lessons booked by your learners
            </p>
          </div>
          <Link
            to="/instructor/dashboard"
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Empty state */}
        {bookings && bookings.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">No bookings yet.</p>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Upcoming
            </h2>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {b.learner.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {b.availability.slotDate} &middot;{" "}
                      {b.availability.startTime} &ndash;{" "}
                      {b.availability.endTime}
                    </p>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Confirmed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past / cancelled */}
        {past.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Past &amp; Cancelled
            </h2>
            <div className="space-y-3">
              {past.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between opacity-70"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {b.learner.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {b.availability.slotDate} &middot;{" "}
                      {b.availability.startTime} &ndash;{" "}
                      {b.availability.endTime}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      b.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
