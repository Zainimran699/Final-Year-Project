import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import type { ProgressSummary } from "../types";

export default function Progress() {
  const [data, setData] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ progress: ProgressSummary }>("/api/progress/me")
      .then((res) => setData(res.data.progress))
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Failed to load progress";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-600 text-center mt-12">Loading progress...</p>
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

  if (!data) return null;

  const { stats, results } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
            <p className="text-gray-500 mt-1">
              Track your theory and hazard test scores over time
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Overall */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 font-medium mb-1">Overall</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.overall.passed}/{stats.overall.attempts}
            </p>
            <p className="text-sm text-gray-500">
              pass rate {stats.overall.passRate.toFixed(0)}%
            </p>
          </div>

          {/* Theory */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-blue-600 font-medium mb-1">Theory</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.theory.passed}/{stats.theory.attempts}
            </p>
            <p className="text-sm text-gray-500">
              avg {stats.theory.avgScorePct.toFixed(0)}% &middot; best{" "}
              {stats.theory.bestScorePct.toFixed(0)}%
            </p>
          </div>

          {/* Hazard */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-amber-600 font-medium mb-1">Hazard</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.hazard.passed}/{stats.hazard.attempts}
            </p>
            <p className="text-sm text-gray-500">
              avg {stats.hazard.avgScorePct.toFixed(0)}% &middot; best{" "}
              {stats.hazard.bestScorePct.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Empty state */}
        {results.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              You haven&apos;t taken any tests yet. Start a{" "}
              <Link to="/theory" className="text-blue-600 underline">
                Theory
              </Link>{" "}
              or{" "}
              <Link to="/hazard" className="text-amber-600 underline">
                Hazard
              </Link>{" "}
              test to see your results here.
            </p>
          </div>
        )}

        {/* Results table */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-5 py-3 text-gray-700">
                      {new Date(r.takenAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
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
                    <td className="px-5 py-3 text-gray-700">
                      {r.score}/{r.totalQuestions} (
                      {Math.round((r.score / r.totalQuestions) * 100)}%)
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {r.timeTakenSeconds != null
                        ? `${Math.floor(r.timeTakenSeconds / 60)}m ${r.timeTakenSeconds % 60}s`
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
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
          </div>
        )}
      </div>
    </div>
  );
}
