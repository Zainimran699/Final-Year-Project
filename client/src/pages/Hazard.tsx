import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import type { HazardQuestion, HazardSubmitResult } from "../types";

// Option keys for hazard questions (same a/b/c/d pattern as theory).
const OPTION_KEYS = ["a", "b", "c", "d"] as const;

// 5-minute time limit for the hazard perception test (in seconds).
const TIME_LIMIT = 5 * 60;

// Map an option key to the question's corresponding option text.
function optionText(q: HazardQuestion, key: string): string {
  switch (key) {
    case "a": return q.optionA;
    case "b": return q.optionB;
    case "c": return q.optionC;
    case "d": return q.optionD;
    default: return "";
  }
}

// Format seconds into MM:SS.
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Hazard() {
  // Quiz phases: intro → active → results.
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<HazardQuestion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<HazardSubmitResult | null>(null);

  // Timer state.
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Track images that failed to load so we show a fallback.
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Submit handler — callable from both button and auto-submit on timer expiry.
  const doSubmit = useCallback(
    async (currentAnswers: Record<number, string>, qs: HazardQuestion[]) => {
      stopTimer();
      setSubmitting(true);
      setSubmitError(null);
      try {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        const payload = {
          answers: qs.map((q) => ({
            questionId: q.id,
            selected: currentAnswers[q.id] ?? "a",
          })),
          timeTakenSeconds: elapsed,
        };
        const res = await api.post<HazardSubmitResult>(
          "/api/hazard/submit",
          payload
        );
        setResult(res.data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Submission failed";
        setSubmitError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [stopTimer]
  );

  // Load questions and start the timer.
  function startQuiz() {
    setStarted(true);
    setQuestions(null);
    setLoadError(null);
    setAnswers({});
    setResult(null);
    setSubmitError(null);
    setTimeLeft(TIME_LIMIT);
    setBrokenImages(new Set());
    startTimeRef.current = Date.now();

    api
      .get<{ questions: HazardQuestion[] }>("/api/hazard/questions")
      .then((res) => setQuestions(res.data.questions))
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Failed to load questions";
        setLoadError(message);
      });
  }

  // Countdown timer — starts when questions load, stops on result.
  useEffect(() => {
    if (!started || !questions || result) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => stopTimer();
  }, [started, questions, result, stopTimer]);

  // Auto-submit when timer hits 0.
  useEffect(() => {
    if (timeLeft === 0 && questions && !result && !submitting) {
      doSubmit(answers, questions);
    }
  }, [timeLeft, questions, result, submitting, answers, doSubmit]);

  // Manual submit.
  function handleSubmit() {
    if (!questions) return;
    if (questions.some((q) => !answers[q.id])) {
      setSubmitError("Please answer every question before submitting.");
      return;
    }
    doSubmit(answers, questions);
  }

  // Build result lookup keyed by questionId.
  const resultByQid: Record<number, HazardSubmitResult["results"][number]> = {};
  if (result) {
    for (const r of result.results) {
      resultByQid[r.questionId] = r;
    }
  }

  // ---------- INTRO SCREEN ----------
  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-xl mx-auto mt-12">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="bg-amber-100 rounded-full p-4 inline-block mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8 text-amber-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Hazard Perception Test
            </h1>
            <p className="text-gray-500 mb-6">
              You will be shown real driving scenes and asked to identify
              developing hazards. Choose the best answer for each image. You
              have <strong>5 minutes</strong> to complete the test.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-800 font-medium text-sm"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={startQuiz}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                Start Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- QUIZ / RESULTS ----------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header + timer */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Hazard Perception Test
          </h1>
          <div className="flex items-center gap-4">
            {!result && questions && (
              <span
                className={`font-mono text-lg font-semibold px-3 py-1 rounded-lg ${
                  timeLeft <= 60
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            )}
            <Link
              to="/dashboard"
              className="text-blue-600 hover:text-blue-700 underline text-sm"
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        {loadError && (
          <p className="text-red-600 bg-white rounded-lg shadow p-4">
            {loadError}
          </p>
        )}

        {!questions && !loadError && (
          <p className="text-gray-600">Loading questions...</p>
        )}

        {/* Score card */}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">
              Score: {result.score} / {result.total}
            </h2>
            <p
              className={`text-lg font-medium ${
                result.passed ? "text-green-700" : "text-red-700"
              }`}
            >
              {result.passed ? "Passed" : "Not passed"}
            </p>
            <button
              onClick={startQuiz}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg px-5 py-2.5 transition-colors"
            >
              Try another set
            </button>
          </div>
        )}

        {/* Questions */}
        {questions && (
          <ol className="space-y-6">
            {questions.map((q, idx) => {
              const selected = answers[q.id];
              const row = resultByQid[q.id];
              return (
                <li
                  key={q.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Hazard image with fallback */}
                  {brokenImages.has(q.id) ? (
                    <div className="w-full h-56 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                      Image unavailable
                    </div>
                  ) : (
                    <img
                      src={q.imageUrl}
                      alt={`Hazard scene ${idx + 1}`}
                      className="w-full h-56 object-cover"
                      onError={() =>
                        setBrokenImages((prev) => new Set(prev).add(q.id))
                      }
                    />
                  )}

                  <div className="p-5">
                    <p className="font-medium text-gray-900 mb-3">
                      {idx + 1}. {q.questionText}
                    </p>

                    <ul className="space-y-2">
                      {OPTION_KEYS.map((key) => {
                        const isSelected = selected === key;
                        const isCorrect = row?.correctOption === key;
                        const isWrongChoice =
                          row && row.selected === key && !row.isCorrect;
                        let cls =
                          "p-3 rounded-lg border cursor-pointer transition-colors";
                        if (row) {
                          if (isCorrect) cls += " border-green-500 bg-green-50";
                          else if (isWrongChoice) cls += " border-red-500 bg-red-50";
                          else cls += " border-gray-200";
                        } else if (isSelected) {
                          cls += " border-blue-500 bg-blue-50";
                        } else {
                          cls += " border-gray-200 hover:border-gray-300";
                        }
                        return (
                          <li key={key} className={cls}>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`hq-${q.id}`}
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
                              <span className="font-medium uppercase w-4 text-gray-600">
                                {key})
                              </span>
                              <span className="text-gray-800">
                                {optionText(q, key)}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Show the description after submission for each question */}
                    {row && (
                      <p className={`mt-3 text-sm p-3 rounded-lg ${
                        row.isCorrect
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}>
                        {row.description}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Submit button */}
        {questions && !result && (
          <div className="mt-6">
            {submitError && (
              <p className="text-red-600 mb-2">{submitError}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg px-6 py-2.5 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit answers"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
