import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Toast from "../components/Toast";
import type { AdminHazardQuestion } from "../types";

const EMPTY_FORM = {
  imageUrl: "",
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "a",
  description: "",
};

export default function AdminHazard() {
  const [questions, setQuestions] = useState<AdminHazardQuestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form state.
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  function loadQuestions() {
    api
      .get<{ questions: AdminHazardQuestion[] }>("/api/admin/hazard")
      .then((res) => setQuestions(res.data.questions))
      .catch(() => setToast({ message: "Failed to load questions", type: "error" }))
      .finally(() => setLoading(false));
  }

  const filtered = questions?.filter((q) =>
    q.questionText.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(q: AdminHazardQuestion) {
    setEditId(q.id);
    setForm({
      imageUrl: q.imageUrl,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      description: q.description,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const res = await api.put<{ question: AdminHazardQuestion }>(
          `/api/admin/hazard/${editId}`,
          form
        );
        setQuestions((prev) =>
          prev ? prev.map((q) => (q.id === editId ? res.data.question : q)) : prev
        );
        setToast({ message: "Question updated", type: "success" });
      } else {
        const res = await api.post<{ question: AdminHazardQuestion }>(
          "/api/admin/hazard",
          form
        );
        setQuestions((prev) =>
          prev ? [...prev, res.data.question] : [res.data.question]
        );
        setToast({ message: "Question created", type: "success" });
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditId(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to save question";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/hazard/${id}`);
      setQuestions((prev) => (prev ? prev.filter((q) => q.id !== id) : prev));
      setToast({ message: "Question deleted", type: "success" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to delete question";
      setToast({ message, type: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-600 text-center mt-12">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hazard Questions
            </h1>
            <p className="text-gray-500 mt-1">
              Create, edit, or remove hazard-perception scenarios
            </p>
          </div>
          <Link
            to="/admin/dashboard"
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={openCreate}
            className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap"
          >
            + Add Question
          </button>
        </div>

        {/* Inline form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 space-y-4"
          >
            <h2 className="font-semibold text-gray-900">
              {editId ? "Edit Hazard Question" : "New Hazard Question"}
            </h2>

            {/* Image URL + live preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <input
                type="url"
                required
                value={form.imageUrl}
                onChange={(e) => setField("imageUrl", e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="mt-2 h-32 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Text
              </label>
              <input
                type="text"
                required
                value={form.questionText}
                onChange={(e) => setField("questionText", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["optionA", "optionB", "optionC", "optionD"] as const).map(
                (key) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">
                      Option {key.slice(-1).toUpperCase()}
                    </label>
                    <input
                      type="text"
                      required
                      value={form[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Correct Option
                </label>
                <select
                  value={form.correctOption}
                  onChange={(e) => setField("correctOption", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="a">A</option>
                  <option value="b">B</option>
                  <option value="c">C</option>
                  <option value="d">D</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Description (shown after submission)
                </label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="text-gray-600 hover:text-gray-800 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Questions list */}
        {filtered && filtered.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              {search ? "No questions match your search." : "No hazard questions yet."}
            </p>
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="flex">
                  {/* Thumbnail */}
                  <img
                    src={q.imageUrl}
                    alt="Hazard"
                    className="w-32 h-24 object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                      (e.target as HTMLImageElement).alt = "No image";
                    }}
                  />
                  <div className="flex-1 p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {q.questionText}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Answer: <span className="uppercase font-medium">{q.correctOption}</span>
                      </p>
                    </div>
                    <div className="flex gap-3 ml-4 flex-shrink-0">
                      <button
                        onClick={() => openEdit(q)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        disabled={deletingId === q.id}
                        className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                      >
                        {deletingId === q.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
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
