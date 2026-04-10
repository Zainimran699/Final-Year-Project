import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Toast from "../components/Toast";
import type { AdminTheoryQuestion } from "../types";

// Blank form state for creating a new question.
const EMPTY_FORM = {
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "a",
  category: "",
};

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<AdminTheoryQuestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form state — if editId is set we're editing, otherwise creating.
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
      .get<{ questions: AdminTheoryQuestion[] }>("/api/admin/theory")
      .then((res) => setQuestions(res.data.questions))
      .catch(() => setToast({ message: "Failed to load questions", type: "error" }))
      .finally(() => setLoading(false));
  }

  // Filter by search term (question text or category).
  const filtered = questions?.filter(
    (q) =>
      q.questionText.toLowerCase().includes(search.toLowerCase()) ||
      q.category.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(q: AdminTheoryQuestion) {
    setEditId(q.id);
    setForm({
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      category: q.category,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        // Update existing question.
        const res = await api.put<{ question: AdminTheoryQuestion }>(
          `/api/admin/theory/${editId}`,
          form
        );
        setQuestions((prev) =>
          prev
            ? prev.map((q) => (q.id === editId ? res.data.question : q))
            : prev
        );
        setToast({ message: "Question updated", type: "success" });
      } else {
        // Create new question.
        const res = await api.post<{ question: AdminTheoryQuestion }>(
          "/api/admin/theory",
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
      await api.delete(`/api/admin/theory/${id}`);
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

  // Helper to update a single form field.
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
              Theory Questions
            </h1>
            <p className="text-gray-500 mt-1">
              Create, edit, or remove multiple-choice theory questions
            </p>
          </div>
          <Link
            to="/admin/dashboard"
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Toolbar: search + add button */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or categories..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap"
          >
            + Add Question
          </button>
        </div>

        {/* Inline form (create / edit) */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 space-y-4"
          >
            <h2 className="font-semibold text-gray-900">
              {editId ? "Edit Question" : "New Question"}
            </h2>

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
                  Category
                </label>
                <input
                  type="text"
                  required
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  placeholder="e.g. road signs"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
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

        {/* Questions table */}
        {filtered && filtered.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              {search ? "No questions match your search." : "No theory questions yet."}
            </p>
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-5 py-3 font-medium">Question</th>
                  <th className="px-5 py-3 font-medium w-28">Category</th>
                  <th className="px-5 py-3 font-medium w-20">Answer</th>
                  <th className="px-5 py-3 font-medium w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-5 py-3 text-gray-800 max-w-xs truncate">
                      {q.questionText}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {q.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 uppercase font-medium">
                      {q.correctOption}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openEdit(q)}
                        className="text-blue-600 hover:text-blue-700 font-medium mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        disabled={deletingId === q.id}
                        className="text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        {deletingId === q.id ? "..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
