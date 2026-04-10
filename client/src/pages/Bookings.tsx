import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Toast from "../components/Toast";
import type { BookingRow } from "../types";

export default function Bookings() {
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    api
      .get<{ bookings: BookingRow[] }>("/api/bookings/me")
      .then((res) => setBookings(res.data.bookings))
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Failed to load bookings";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel(id: number) {
    setCancellingId(id);
    try {
      await api.delete(`/api/bookings/${id}`);
      // Update local state — mark the booking as cancelled.
      setBookings((prev) =>
        prev
          ? prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))
          : prev
      );
      setToast({ message: "Booking cancelled", type: "success" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to cancel booking";
      setToast({ message, type: "error" });
    } finally {
      setCancellingId(null);
    }
  }

  // Partition bookings into upcoming (confirmed) and past/cancelled.
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
              Your upcoming and past driving lessons
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Empty state */}
        {bookings && bookings.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              You don&apos;t have any bookings yet.{" "}
              <Link to="/instructors" className="text-blue-600 underline">
                Find an instructor
              </Link>{" "}
              to book your first lesson.
            </p>
          </div>
        )}

        {/* Upcoming bookings */}
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
                      {b.instructor.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {b.availability.slotDate} &middot;{" "}
                      {b.availability.startTime} &ndash;{" "}
                      {b.availability.endTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Confirmed
                    </span>
                    <button
                      onClick={() => handleCancel(b.id)}
                      disabled={cancellingId === b.id}
                      className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      {cancellingId === b.id ? "Cancelling..." : "Cancel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past / cancelled bookings */}
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
                      {b.instructor.name}
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
