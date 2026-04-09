import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import type {
  OptionKey,
  TheoryAnswerResult,
  TheoryExplainResponse,
  TheoryQuestion,
  TheorySubmitResult,
} from "../types";

const OPTION_KEYS: OptionKey[] = ["a", "b", "c", "d"];

function optionTextByKey(q: TheoryQuestion, key: OptionKey): string {
  switch (key) {
    case "a":
      return q.optionA;
    case "b":
      return q.optionB;
    case "c":
      return q.optionC;
    case "d":
      return q.optionD;
  }
}

export default function Theory() {
  const [questions, setQuestions] = useState<TheoryQuestion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<TheorySubmitResult | null>(null);

  // Explanation state per questionId — loading, text, or null/undefined.
  const [explanations, setExplanations] = useState<
    Record<number, { loading: boolean; text: string | null; error: string | null }>
  >({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get<{ questions: TheoryQuestion[] }>(
          "/api/theory/questions"
        );
        if (!cancelled) setQuestions(res.data.questions);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Failed to load questions";
        setLoadError(message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    if (!questions) return;
    setSubmitError(null);
    if (questions.some((q) => !answers[q.id])) {
      setSubmitError("Please answer every question before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        answers: questions.map((q) => ({
          questionId: q.id,
          selected: answers[q.id],
        })),
      };
      const res = await api.post<TheorySubmitResult>(
        "/api/theory/submit",
        payload
      );
      setResult(res.data);
      // Scroll to top so the user sees their score.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Submission failed";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchExplanation(
    questionId: number,
    selectedOption: OptionKey
  ) {
    setExplanations((prev) => ({
      ...prev,
      [questionId]: { loading: true, text: null, error: null },
    }));
    try {
      const res = await api.post<TheoryExplainResponse>(
        "/api/theory/explain",
        { questionId, selectedOption }
      );
      setExplanations((prev) => ({
        ...prev,
        [questionId]: {
          loading: false,
          text: res.data.explanation,
          error: null,
        },
      }));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to load explanation";
      setExplanations((prev) => ({
        ...prev,
        [questionId]: { loading: false, text: null, error: message },
      }));
    }
  }

  function resetQuiz() {
    setResult(null);
    setAnswers({});
    setExplanations({});
    setSubmitError(null);
    // Refetch a fresh random set.
    setQuestions(null);
    setLoadError(null);
    api
      .get<{ questions: TheoryQuestion[] }>("/api/theory/questions")
      .then((res) => setQuestions(res.data.questions))
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Failed to load questions";
        setLoadError(message);
      });
  }

  // Index result rows by questionId for the post-submit render.
  const resultByQid: Record<number, TheoryAnswerResult> = {};
  if (result) {
    for (const r of result.results) {
      resultByQid[r.questionId] = r;
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Theory practice test</h1>
          <Link to="/dashboard" className="text-blue-600 underline text-sm">
            Back to dashboard
          </Link>
        </div>

        {loadError && (
          <p className="text-red-600 bg-white rounded-lg shadow p-4">
            {loadError}
          </p>
        )}

        {!questions && !loadError && (
          <p className="text-gray-600">Loading questions...</p>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">
              Score: {result.score} / {result.total}
            </h2>
            <p
              className={`text-lg ${
                result.passed ? "text-green-700" : "text-red-700"
              }`}
            >
              {result.passed ? "Passed" : "Not passed"} (pass mark 86%)
            </p>
            <button
              onClick={resetQuiz}
              className="mt-4 bg-blue-600 text-white rounded px-4 py-2"
            >
              Try another set
            </button>
          </div>
        )}

        {questions && (
          <ol className="space-y-4">
            {questions.map((q, idx) => {
              const selected = answers[q.id];
              const row = resultByQid[q.id];
              return (
                <li
                  key={q.id}
                  className="bg-white rounded-lg shadow p-4"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="font-medium">
                      {idx + 1}. {q.questionText}
                    </p>
                    <span className="text-xs text-gray-500 ml-2">
                      {q.category}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {OPTION_KEYS.map((key) => {
                      const isSelected = selected === key;
                      const isCorrect = row?.correctOption === key;
                      const isWrongChoice =
                        row && row.selected === key && !row.isCorrect;
                      let rowClass = "p-2 rounded border";
                      if (row) {
                        if (isCorrect) {
                          rowClass += " border-green-500 bg-green-50";
                        } else if (isWrongChoice) {
                          rowClass += " border-red-500 bg-red-50";
                        } else {
                          rowClass += " border-gray-200";
                        }
                      } else if (isSelected) {
                        rowClass += " border-blue-500 bg-blue-50";
                      } else {
                        rowClass += " border-gray-200";
                      }
                      return (
                        <li key={key} className={rowClass}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={key}
                              checked={isSelected ?? false}
                              disabled={!!result}
                              onChange={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: key,
                                }))
                              }
                            />
                            <span className="font-medium uppercase w-4">
                              {key})
                            </span>
                            <span>{optionTextByKey(q, key)}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>

                  {row && !row.isCorrect && (
                    <div className="mt-3 text-sm">
                      {!explanations[q.id] && (
                        <button
                          onClick={() => fetchExplanation(q.id, row.selected)}
                          className="text-blue-600 underline"
                        >
                          Why is this wrong?
                        </button>
                      )}
                      {explanations[q.id]?.loading && (
                        <p className="text-gray-600">
                          Loading explanation...
                        </p>
                      )}
                      {explanations[q.id]?.error && (
                        <p className="text-red-600">
                          {explanations[q.id].error}
                        </p>
                      )}
                      {explanations[q.id]?.text && (
                        <p className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-1">
                          {explanations[q.id].text}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {questions && !result && (
          <div className="mt-6">
            {submitError && (
              <p className="text-red-600 mb-2">{submitError}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 text-white rounded px-6 py-2 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit answers"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
