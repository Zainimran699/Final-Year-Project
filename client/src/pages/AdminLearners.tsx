import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import type { AdminLearnerRow, TestResultRow } from "../types";

export default function AdminLearners() {
  const [learners, setLearners] = useState<AdminLearnerRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Results panel — when an admin clicks a learner row, load their results.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [results, setResults] = useState<TestResultRow[] | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    api
      .get<{ learners: AdminLearnerRow[] }>("/api/admin/learners")
      .then((res) => setLearners(res.data.learners))
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Failed to load learners";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  async function selectLearner(id: number) {
    if (selectedId === id) {
      setSelectedId(null);
      setResults(null);
      return;
    }
    setSelectedId(id);
    setResults(null);
    setResultsLoading(true);
    try {
      const res = await api.get<{ results: TestResultRow[] }>(
        `/api/admin/learners/${id}/results`
      );
      setResults(res.data.results);
    } catch {
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  }

  const filtered = learners?.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-600 text-center mt-12">Loading learners...</p>
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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Learners</h1>
            <p className="text-gray-500 mt-1">
              View registered learners and their test history
            </p>
          </div>
          <Link
            to="/admin/dashboard"
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {filtered && filtered.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              {search ? "No learners match your search." : "No learners registered yet."}
            </p>
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((l) => (
              <div key={l.id}>
                {/* Learner row */}
                <button
                  type="button"
                  onClick={() => selectLearner(l.id)}
                  className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between text-left hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-medium text-gray-900">{l.name}</p>
                    <p className="text-sm text-gray-500">{l.email}</p>
                    {l.location && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {l.location}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {l._count.testResults} test{l._count.testResults !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(l.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>

                {/* Expanded results panel */}
                {selectedId === l.id && (
                  <div className="mt-1 ml-4 mr-4 bg-gray-50 rounded-xl border border-gray-200 p-4">
                    {resultsLoading && (
                      <p className="text-sm text-gray-500">Loading results...</p>
                    )}
                    {results && results.length === 0 && (
                      <p className="text-sm text-gray-500">
                        No test results yet.
                      </p>
                    )}
                    {results && results.length > 0 && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-200">
                            <th className="pb-2 font-medium">Date</th>
                            <th className="pb-2 font-medium">Type</th>
                            <th className="pb-2 font-medium">Score</th>
                            <th className="pb-2 font-medium">Time</th>
                            <th className="pb-2 font-medium">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((r) => (
                            <tr key={r.id} className="border-b border-gray-100 last:border-0">
                              <td className="py-2 text-gray-700">
                                {new Date(r.takenAt).toLocaleDateString()}
                              </td>
                              <td className="py-2">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                    r.type === "theory"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {r.type}
                                </span>
                              </td>
                              <td className="py-2 text-gray-700">
                                {r.score}/{r.totalQuestions}
                              </td>
                              <td className="py-2 text-gray-500">
                                {r.timeTakenSeconds != null
                                  ? `${Math.floor(r.timeTakenSeconds / 60)}m ${r.timeTakenSeconds % 60}s`
                                  : "—"}
                              </td>
                              <td className="py-2">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                    r.passed
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {r.passed ? "Passed" : "Failed"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
