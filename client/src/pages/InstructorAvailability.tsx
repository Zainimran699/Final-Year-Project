import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Toast from "../components/Toast";
import type { ManagedSlot } from "../types";

export default function InstructorAvailability() {
  const [slots, setSlots] = useState<ManagedSlot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // New slot form fields.
  const [slotDate, setSlotDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Load slots on mount.
  useEffect(() => {
    loadSlots();
  }, []);

  function loadSlots() {
    api
      .get<{ slots: ManagedSlot[] }>("/api/availability/mine")
      .then((res) => setSlots(res.data.slots))
      .catch(() => setToast({ message: "Failed to load slots", type: "error" }))
      .finally(() => setLoading(false));
  }

  // Add a new availability slot.
  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!slotDate || !startTime || !endTime) return;
    setAdding(true);
    try {
      // Backend returns { availability: {...} }, so unwrap the named key.
      const res = await api.post<{ availability: ManagedSlot }>("/api/availability", {
        slotDate,
        startTime,
        endTime,
      });
      setSlots((prev) => (prev ? [res.data.availability, ...prev] : [res.data.availability]));
      setToast({ message: "Slot added!", type: "success" });
      // Reset form.
      setSlotDate("");
      setStartTime("");
      setEndTime("");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to add slot";
      setToast({ message, type: "error" });
    } finally {
      setAdding(false);
    }
  }

  // Delete an unbooked slot.
  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await api.delete(`/api/availability/${id}`);
      setSlots((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      setToast({ message: "Slot removed", type: "success" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to delete slot";
      setToast({ message, type: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-600 text-center mt-12">Loading availability...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Availability
            </h1>
            <p className="text-gray-500 mt-1">
              Add or remove time slots learners can book with you
            </p>
          </div>
          <Link
            to="/instructor/dashboard"
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Add slot form */}
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6"
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Add a new slot
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label htmlFor="slot-date" className="block text-xs text-gray-500 mb-1">
                Date
              </label>
              <input
                id="slot-date"
                type="date"
                required
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="start-time" className="block text-xs text-gray-500 mb-1">
                Start
              </label>
              <input
                id="start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="end-time" className="block text-xs text-gray-500 mb-1">
                End
              </label>
              <input
                id="end-time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {adding ? "Adding..." : "Add Slot"}
            </button>
          </div>
        </form>

        {/* Existing slots list */}
        {slots && slots.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              You haven&apos;t added any availability slots yet.
            </p>
          </div>
        )}

        {slots && slots.length > 0 && (
          <div className="space-y-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"
              >
                <div className="text-sm">
                  <span className="font-medium text-gray-900">
                    {slot.slotDate}
                  </span>{" "}
                  <span className="text-gray-500">
                    {slot.startTime} &ndash; {slot.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {slot.isBooked ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      Booked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDelete(slot.id)}
                      disabled={deletingId === slot.id}
                      className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      {deletingId === slot.id ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
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
