import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Toast from "../components/Toast";
import type { InstructorProfile as InstructorProfileType } from "../types";

export default function InstructorProfile() {
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Load existing profile on mount.
  useEffect(() => {
    api
      .get<{ profile: InstructorProfileType | null }>("/api/instructors/profile/me")
      .then((res) => {
        const p = res.data.profile;
        if (p) {
          setBio(p.bio ?? "");
          setLocation(p.location);
          setHourlyRate(String(p.hourlyRate));
        }
      })
      .catch(() => {
        // No profile yet — that's fine, the form starts empty.
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!location.trim()) {
      setToast({ message: "Location is required", type: "error" });
      return;
    }
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      setToast({ message: "Hourly rate must be a positive number", type: "error" });
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/instructors/profile", {
        bio: bio.trim() || null,
        location: location.trim(),
        hourlyRate: rate,
      });
      setToast({ message: "Profile saved!", type: "success" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to save profile";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-600 text-center mt-12">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500 mt-1">
              Update your bio, hourly rate, and coverage area
            </p>
          </div>
          <Link
            to="/instructor/dashboard"
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Back to dashboard
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
        >
          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Bio <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell learners a bit about yourself..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="profile-location"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location
            </label>
            <input
              id="profile-location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Manchester"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Hourly rate */}
          <div>
            <label
              htmlFor="rate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Hourly Rate (&pound;)
            </label>
            <input
              id="rate"
              type="number"
              step="0.50"
              min="1"
              required
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="e.g. 35"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
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
