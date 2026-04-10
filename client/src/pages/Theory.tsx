import { useCallback, useEffect, useRef, useState } from "react";
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

// 6-minute time limit for the theory test (in seconds).
const TIME_LIMIT = 6 * 60;

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

// Format seconds into MM:SS for the countdown display.
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Theory() {
  // Quiz state: null = not started (show intro), loaded = quiz active.
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<TheoryQuestion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<TheorySubmitResult | null>(null);

  // Timer state — counts down from TIME_LIMIT to 0.
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track when the quiz started so we can compute elapsed time on submit.
  const startTimeRef = useRef<number>(0);

  // Explanation state per questionId.
  const [explanations, setExplanations] = useState<
    Record<number, { loading: boolean; text: string | null; error: string | null }>
  >({});

  // Stop the countdown timer.
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Submit answers — extracted so it can be called by both the button and
  // the auto-submit when the timer expires.
  const doSubmit = useCallback(
    async (currentAnswers: Record<number, OptionKey>, qs: TheoryQuestion[]) => {
      stopTimer();
      setSubmitting(true);
      setSubmitError(null);
      try {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        const payload = {
          answers: qs.map((q) => ({
            questionId: q.id,
            selected: currentAnswers[q.id] ?? "a", // default unanswered to "a"
          })),
          timeTakenSeconds: elapsed,
        };
        const res = await api.post<TheorySubmitResult>(
          "/api/theory/submit",
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

  // Load questions when the learner clicks "Start".
  function startQuiz() {
    setStarted(true);
    setQuestions(null);
    setLoadError(null);
    setAnswers({});
    setResult(null);
    setExplanations({});
    setSubmitError(null);
    setTimeLeft(TIME_LIMIT);
    startTimeRef.current = Date.now();

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

  // Start the countdown timer once questions are loaded.
  useEffect(() => {
    if (!started || !questions || result) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => stopTimer();
  }, [started, questions, result, stopTimer]);

  // Auto-submit when timer reaches 0.
  useEffect(() => {
    if (timeLeft === 0 && questions && !result && !submitting) {
      doSubmit(answers, questions);
    }
  }, [timeLeft, questions, result, submitting, answers, doSubmit]);

  // Manual submit button handler.
  function handleSubmit() {
    if (!questions) return;
    if (questions.some((q) => !answers[q.id])) {
      setSubmitError("Please answer every question before submitting.");
      return;
    }
    doSubmit(answers, questions);
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

  // Index result rows by questionId for the post-submit render.
  const resultByQid: Record<number, TheoryAnswerResult> = {};
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
            <div className="bg-blue-100 rounded-full p-4 inline-block mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Theory Practice Test
            </h1>
            <p className="text-gray-500 mb-6">
              You will receive multiple-choice questions covering road signs,
              speed limits, safety, and motorway rules. You have{" "}
              <strong>6 minutes</strong> to complete the test. The pass mark is{" "}
              <strong>86%</strong>.
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                Start Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- QUIZ / RESULTS SCREEN ----------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header with timer */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Theory Practice Test
          </h1>
          <div className="flex items-center gap-4">
            {/* Countdown timer — hidden after submission */}
            {!result && questions && (
              <span
                className={`font-mono text-lg font-semibold px-3 py-1 rounded-lg ${
                  timeLeft <= 60
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
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

        {/* Score card after submission */}
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
              {result.passed ? "Passed" : "Not passed"} (pass mark 86%)
            </p>
            <button
              onClick={startQuiz}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-5 py-2.5 transition-colors"
            >
              Try another set
            </button>
          </div>
        )}

        {/* Question list */}
        {questions && (
          <ol className="space-y-4">
            {questions.map((q, idx) => {
              const selected = answers[q.id];
              const row = resultByQid[q.id];
              return (
                <li
                  key={q.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="font-medium text-gray-900">
                      {idx + 1}. {q.questionText}
                    </p>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                      {q.category}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {OPTION_KEYS.map((key) => {
                      const isSelected = selected === key;
                      const isCorrect = row?.correctOption === key;
                      const isWrongChoice =
                        row && row.selected === key && !row.isCorrect;
                      let rowClass =
                        "p-3 rounded-lg border cursor-pointer transition-colors";
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
                        rowClass += " border-gray-200 hover:border-gray-300";
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
                            <span className="font-medium uppercase w-4 text-gray-600">
                              {key})
                            </span>
                            <span className="text-gray-800">
                              {optionTextByKey(q, key)}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>

                  {/* AI explanation for wrong answers */}
                  {row && !row.isCorrect && (
                    <div className="mt-3 text-sm">
                      {!explanations[q.id] && (
                        <button
                          onClick={() => fetchExplanation(q.id, row.selected)}
                          className="text-blue-600 hover:text-blue-700 underline font-medium"
                        >
                          Why is this wrong?
                        </button>
                      )}
                      {explanations[q.id]?.loading && (
                        <p className="text-gray-500">
                          Loading explanation...
                        </p>
                      )}
                      {explanations[q.id]?.error && (
                        <p className="text-red-600">
                          {explanations[q.id].error}
                        </p>
                      )}
                      {explanations[q.id]?.text && (
                        <p className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-1 text-gray-700">
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

        {/* Submit button */}
        {questions && !result && (
          <div className="mt-6">
            {submitError && (
              <p className="text-red-600 mb-2">{submitError}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-2.5 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit answers"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
