import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Toast from "../components/Toast";
import type {
  AvailabilitySlot,
  InstructorWithSlots,
  PublicInstructor,
} from "../types";

export default function InstructorSearch() {
  // Search / listing state.
  const [locationQuery, setLocationQuery] = useState("");
  const [instructors, setInstructors] = useState<PublicInstructor[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Expanded instructor (shows available slots).
  const [expanded, setExpanded] = useState<InstructorWithSlots | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);

  // Booking flow.
  const [bookingSlotId, setBookingSlotId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Load instructor list on mount (and when user searches).
  useEffect(() => {
    loadInstructors();
  }, []);

  function loadInstructors(location?: string) {
    setLoadError(null);
    const params = location ? `?location=${encodeURIComponent(location)}` : "";
    // Backend returns { instructors: [...] }, so unwrap the named key.
    api
      .get<{ instructors: PublicInstructor[] }>(`/api/instructors${params}`)
      .then((res) => setInstructors(res.data.instructors))
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Failed to load instructors";
        setLoadError(message);
      });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setExpanded(null);
    loadInstructors(locationQuery.trim() || undefined);
  }

  // Fetch a single instructor's detail (with available slots).
  async function expandInstructor(id: number) {
    if (expanded?.id === id) {
      setExpanded(null);
      return;
    }
    setExpandLoading(true);
    try {
      // Backend returns { instructor: {...} }, so unwrap the named key.
      const res = await api.get<{ instructor: InstructorWithSlots }>(`/api/instructors/${id}`);
      setExpanded(res.data.instructor);
    } catch {
      setToast({ message: "Failed to load instructor details", type: "error" });
    } finally {
      setExpandLoading(false);
    }
  }

  // Book a slot.
  async function bookSlot(slot: AvailabilitySlot) {
    setBookingSlotId(slot.id);
    try {
      await api.post("/api/bookings", { availabilityId: slot.id });
      setToast({ message: "Lesson booked successfully!", type: "success" });
      // Refresh the expanded instructor to reflect the booked slot.
      if (expanded) {
        setExpanded({
          ...expanded,
          availability: expanded.availability.filter((s) => s.id !== slot.id),
        });
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Booking failed";
      setToast({ message, type: "error" });
    } finally {
      setBookingSlotId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Find an Instructor
            </h1>
            <p className="text-gray-500 mt-1">
              Browse qualified driving instructors and book a lesson
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-3">
          <input
            type="text"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            placeholder="Search by location (e.g. Manchester)"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            Search
          </button>
        </form>

        {loadError && (
          <p className="text-red-600 bg-white rounded-lg shadow p-4 mb-4">
            {loadError}
          </p>
        )}

        {!instructors && !loadError && (
          <p className="text-gray-600">Loading instructors...</p>
        )}

        {instructors && instructors.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              No instructors found.{" "}
              {locationQuery && "Try a different location."}
            </p>
          </div>
        )}

        {/* Instructor cards */}
        {instructors && instructors.length > 0 && (
          <div className="space-y-4">
            {instructors.map((inst) => (
              <div
                key={inst.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Instructor summary row */}
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {inst.name}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{inst.profile.location}</span>
                      <span className="font-medium text-green-700">
                        &pound;{inst.profile.hourlyRate}/hr
                      </span>
                    </div>
                    {inst.profile.bio && (
                      <p className="text-sm text-gray-600 mt-2">
                        {inst.profile.bio}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => expandInstructor(inst.id)}
                    disabled={expandLoading}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm whitespace-nowrap"
                  >
                    {expanded?.id === inst.id ? "Hide slots" : "View slots"}
                  </button>
                </div>

                {/* Expanded: available time slots */}
                {expanded?.id === inst.id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5">
                    {expanded.availability.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No available slots at the moment.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Available slots:
                        </p>
                        {expanded.availability.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3"
                          >
                            <div className="text-sm">
                              <span className="font-medium text-gray-900">
                                {slot.slotDate}
                              </span>{" "}
                              <span className="text-gray-500">
                                {slot.startTime} &ndash; {slot.endTime}
                              </span>
                            </div>
                            <button
                              onClick={() => bookSlot(slot)}
                              disabled={bookingSlotId === slot.id}
                              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {bookingSlotId === slot.id
                                ? "Booking..."
                                : "Book"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
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
