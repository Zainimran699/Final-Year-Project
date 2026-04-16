/**
 * AIAssistantDrawer — right-side slide-in panel for admin-only AI drafting.
 *
 * This is the visual & interaction core of the Phase-20 AI content feature.
 * It sits on top of AdminQuestions and AdminHazard and offers:
 *
 *   - "Generate from scratch"  — admin types a topic/focus; the AI returns
 *                                 a complete question draft pre-filled with
 *                                 options + correct answer + category.
 *   - "Generate a batch"        — (theory only) admin asks for N variations
 *                                 on a theme; drawer lists them as apply-
 *                                 able cards.
 *   - "Improve my draft"        — takes the admin's current form state and
 *                                 asks the AI to tighten wording, make
 *                                 distractors better, fix grammar.
 *   - "Quick chips"             — one-click prompts ("Mini-roundabouts",
 *                                 "Stopping distances", etc.) that skip
 *                                 the free-text box.
 *
 * Architecture:
 *   The drawer is "pure UI + API calls" — it owns its own state, makes
 *   POST /api/admin/ai/* requests directly, and calls `onApply(draft)`
 *   when the admin clicks "Use this draft". The parent page receives the
 *   draft and merges it into its form state. No shared global state, no
 *   router coupling.
 *
 * Why a drawer, not a modal:
 *   The admin needs to see the form they're working on while iterating with
 *   the AI. A right-side drawer keeps the form visible on the left and
 *   doesn't trap keyboard focus the way a modal would.
 *
 * Motion:
 *   Enter/exit via framer-motion's AnimatePresence with a spring slide
 *   from the right. Backdrop fades. All motion honours
 *   `prefers-reduced-motion`.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api";
import type {
  TheoryQuestionDraft,
  HazardQuestionDraft,
  ImproveKind,
} from "../../types";

// ---------------------------------------------------------------------------
// Props — the drawer is context-aware via `mode`. Parent pages pass their
// current form state (`currentDraft`) so "Improve my draft" has something
// to work with.
// ---------------------------------------------------------------------------

type TheoryMode = {
  mode: "theory";
  open: boolean;
  onClose: () => void;
  onApply: (draft: TheoryQuestionDraft) => void;
  currentDraft?: Partial<TheoryQuestionDraft>;
};

type HazardMode = {
  mode: "hazard";
  open: boolean;
  onClose: () => void;
  onApply: (draft: HazardQuestionDraft) => void;
  currentDraft?: Partial<HazardQuestionDraft>;
  /** The image URL is required for hazard generation — parent owns it. */
  imageUrl?: string;
};

type Props = TheoryMode | HazardMode;

// ---------------------------------------------------------------------------
// Theory quick-chips — one-click prompts covering the four DriveReady221
// categories plus a few common exam themes.
// ---------------------------------------------------------------------------

const THEORY_CHIPS = [
  { label: "Road signs", topic: "road signs and their meanings", category: "Road Signs" },
  { label: "Speed limits", topic: "UK speed limits in different conditions", category: "Speed Limits" },
  { label: "Safety", topic: "vehicle safety checks and seat belts", category: "Safety" },
  { label: "Motorway rules", topic: "motorway lane discipline and rules", category: "Motorway Rules" },
  { label: "Stopping distances", topic: "stopping distances in wet and dry conditions", category: "Safety" },
  { label: "Roundabouts", topic: "roundabout priority and lane positioning", category: "Motorway Rules" },
];

const HAZARD_CHIPS = [
  "Pedestrian stepping out between parked cars",
  "Cyclist on the inside of a turning vehicle",
  "Vehicle emerging from a side road",
  "Child playing near the roadside",
  "Brake lights on the vehicle ahead",
  "Slippery surface after rain",
];

const THEORY_CATEGORIES = [
  "Road Signs",
  "Speed Limits",
  "Safety",
  "Motorway Rules",
] as const;

// ---------------------------------------------------------------------------
// Inline SVG icons — tiny, no library. Matches the rest of the app.
// ---------------------------------------------------------------------------

function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.814a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function AIAssistantDrawer(props: Props) {
  const { open, onClose, mode } = props;

  // Free-text prompts (shared across tabs)
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<string>(""); // theory only
  const [batchCount, setBatchCount] = useState(3);

  // Hazard focus hint
  const [focus, setFocus] = useState("");

  // Result state — either a single draft or a batch
  const [singleTheory, setSingleTheory] = useState<TheoryQuestionDraft | null>(null);
  const [batchTheory, setBatchTheory] = useState<TheoryQuestionDraft[] | null>(null);
  const [singleHazard, setSingleHazard] = useState<HazardQuestionDraft | null>(null);

  // UI state
  const [busy, setBusy] = useState<null | "single" | "batch" | "improve">(null);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state when the drawer opens — so reopening doesn't
  // show yesterday's stale draft.
  function resetState() {
    setTopic("");
    setCategory("");
    setFocus("");
    setBatchCount(3);
    setSingleTheory(null);
    setBatchTheory(null);
    setSingleHazard(null);
    setError(null);
    setBusy(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  // --------------------------- API helpers ---------------------------

  async function callTheorySingle(opts: { topic?: string; category?: string }) {
    setBusy("single");
    setError(null);
    setSingleTheory(null);
    setBatchTheory(null);
    try {
      const res = await api.post<{ question: TheoryQuestionDraft }>(
        "/api/admin/ai/theory",
        opts
      );
      setSingleTheory(res.data.question);
    } catch (err: unknown) {
      setError(extractError(err, "Failed to generate question"));
    } finally {
      setBusy(null);
    }
  }

  async function callTheoryBatch() {
    if (!topic.trim()) {
      setError("Enter a topic to generate a batch");
      return;
    }
    setBusy("batch");
    setError(null);
    setSingleTheory(null);
    setBatchTheory(null);
    try {
      const res = await api.post<{ questions: TheoryQuestionDraft[] }>(
        "/api/admin/ai/theory/batch",
        {
          topic: topic.trim(),
          count: batchCount,
          category: category || undefined,
        }
      );
      setBatchTheory(res.data.questions);
    } catch (err: unknown) {
      setError(extractError(err, "Failed to generate batch"));
    } finally {
      setBusy(null);
    }
  }

  async function callTheoryImprove() {
    if (mode !== "theory") return;
    if (!props.currentDraft) {
      setError("Fill in the form first, then click Improve.");
      return;
    }
    setBusy("improve");
    setError(null);
    setSingleTheory(null);
    setBatchTheory(null);
    try {
      const res = await api.post<{ question: TheoryQuestionDraft }>(
        "/api/admin/ai/theory",
        { improve: props.currentDraft }
      );
      setSingleTheory(res.data.question);
    } catch (err: unknown) {
      setError(extractError(err, "Failed to improve draft"));
    } finally {
      setBusy(null);
    }
  }

  async function callHazardSingle(focusOverride?: string) {
    if (mode !== "hazard") return;
    const imageUrl = props.imageUrl?.trim();
    if (!imageUrl) {
      setError("Enter an image URL in the form first.");
      return;
    }
    setBusy("single");
    setError(null);
    setSingleHazard(null);
    try {
      const res = await api.post<{ question: HazardQuestionDraft }>(
        "/api/admin/ai/hazard",
        { imageUrl, focus: focusOverride ?? focus.trim() || undefined }
      );
      setSingleHazard(res.data.question);
    } catch (err: unknown) {
      setError(extractError(err, "Failed to generate hazard question"));
    } finally {
      setBusy(null);
    }
  }

  async function callHazardImprove() {
    if (mode !== "hazard") return;
    const imageUrl = props.imageUrl?.trim();
    if (!imageUrl) {
      setError("Enter an image URL in the form first.");
      return;
    }
    if (!props.currentDraft) {
      setError("Fill in the form first, then click Improve.");
      return;
    }
    setBusy("improve");
    setError(null);
    setSingleHazard(null);
    try {
      const res = await api.post<{ question: HazardQuestionDraft }>(
        "/api/admin/ai/hazard",
        { imageUrl, improve: props.currentDraft }
      );
      setSingleHazard(res.data.question);
    } catch (err: unknown) {
      setError(extractError(err, "Failed to improve draft"));
    } finally {
      setBusy(null);
    }
  }

  // --------------------------- Apply handlers ---------------------------

  function applyTheory(d: TheoryQuestionDraft) {
    if (mode === "theory") {
      props.onApply(d);
      handleClose();
    }
  }

  function applyHazard(d: HazardQuestionDraft) {
    if (mode === "hazard") {
      props.onApply(d);
      handleClose();
    }
  }

  // --------------------------- Render ---------------------------

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-500 via-blue-600 to-purple-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <SparkleIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-white/80">
                    AI Assistant
                  </p>
                  <h2 className="text-lg font-bold leading-tight">
                    {mode === "theory" ? "Draft a theory question" : "Draft a hazard question"}
                  </h2>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close AI assistant"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Body — scrolls independently */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {mode === "theory" ? (
                <TheorySection
                  topic={topic}
                  setTopic={setTopic}
                  category={category}
                  setCategory={setCategory}
                  batchCount={batchCount}
                  setBatchCount={setBatchCount}
                  busy={busy}
                  onGenerateSingle={() =>
                    callTheorySingle({
                      topic: topic.trim() || undefined,
                      category: category || undefined,
                    })
                  }
                  onGenerateBatch={callTheoryBatch}
                  onImprove={callTheoryImprove}
                  onChipClick={(chip) =>
                    callTheorySingle({ topic: chip.topic, category: chip.category })
                  }
                  hasCurrentDraft={!!props.currentDraft}
                />
              ) : (
                <HazardSection
                  focus={focus}
                  setFocus={setFocus}
                  busy={busy}
                  imageUrl={props.imageUrl}
                  onGenerateSingle={() => callHazardSingle()}
                  onImprove={callHazardImprove}
                  onChipClick={(text) => callHazardSingle(text)}
                  hasCurrentDraft={!!props.currentDraft}
                />
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Results */}
              {singleTheory && mode === "theory" && (
                <TheoryDraftCard
                  draft={singleTheory}
                  onApply={() => applyTheory(singleTheory)}
                  onRegenerate={() =>
                    callTheorySingle({
                      topic: topic.trim() || undefined,
                      category: category || undefined,
                    })
                  }
                  busy={busy !== null}
                />
              )}

              {batchTheory && mode === "theory" && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">
                    {batchTheory.length} draft question
                    {batchTheory.length === 1 ? "" : "s"} — pick one to apply
                  </p>
                  {batchTheory.map((d, i) => (
                    <TheoryDraftCard
                      key={i}
                      draft={d}
                      onApply={() => applyTheory(d)}
                      compact
                    />
                  ))}
                </div>
              )}

              {singleHazard && mode === "hazard" && (
                <HazardDraftCard
                  draft={singleHazard}
                  onApply={() => applyHazard(singleHazard)}
                  onRegenerate={() => callHazardSingle()}
                  busy={busy !== null}
                />
              )}
            </div>

            {/* Footer — context hint */}
            <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-500 bg-gray-50">
              Drafts are never saved automatically — review before hitting
              Save.
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  // Local sub-components kept inline so the single-file drawer stays
  // self-contained (and the ESLint Fast-Refresh rule doesn't complain).

  function TheorySection(sp: {
    topic: string;
    setTopic: (v: string) => void;
    category: string;
    setCategory: (v: string) => void;
    batchCount: number;
    setBatchCount: (v: number) => void;
    busy: null | "single" | "batch" | "improve";
    onGenerateSingle: () => void;
    onGenerateBatch: () => void;
    onImprove: () => void;
    onChipClick: (chip: (typeof THEORY_CHIPS)[number]) => void;
    hasCurrentDraft: boolean;
  }) {
    return (
      <>
        {/* Quick chips */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Quick prompts
          </p>
          <div className="flex flex-wrap gap-2">
            {THEORY_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => sp.onChipClick(chip)}
                disabled={sp.busy !== null}
                className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Single question from topic */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Generate from a topic
          </p>
          <input
            type="text"
            value={sp.topic}
            onChange={(e) => sp.setTopic(e.target.value)}
            placeholder="e.g. Motorway slip-road joining rules"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <select
              value={sp.category}
              onChange={(e) => sp.setCategory(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Auto-pick category</option>
              {THEORY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={sp.onGenerateSingle}
              disabled={sp.busy !== null}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {sp.busy === "single" ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {/* Batch */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Generate a batch
          </p>
          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">Count:</label>
            <select
              value={sp.batchCount}
              onChange={(e) => sp.setBatchCount(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button
              onClick={sp.onGenerateBatch}
              disabled={sp.busy !== null}
              className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {sp.busy === "batch" ? "Generating..." : "Generate batch"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Uses the topic above. Leaves the category blank for the AI to pick.
          </p>
        </div>

        {/* Improve */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Improve my draft
          </p>
          <button
            onClick={sp.onImprove}
            disabled={sp.busy !== null || !sp.hasCurrentDraft}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <SparkleIcon className="w-4 h-4" />
            {sp.busy === "improve" ? "Polishing..." : "Polish my current draft"}
          </button>
          {!sp.hasCurrentDraft && (
            <p className="text-xs text-gray-400">
              Fill in any part of the form to enable this.
            </p>
          )}
        </div>
      </>
    );
  }

  function HazardSection(sp: {
    focus: string;
    setFocus: (v: string) => void;
    busy: null | "single" | "batch" | "improve";
    imageUrl?: string;
    onGenerateSingle: () => void;
    onImprove: () => void;
    onChipClick: (text: string) => void;
    hasCurrentDraft: boolean;
  }) {
    return (
      <>
        {/* Image URL preview / warning */}
        {!sp.imageUrl ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Paste an image URL in the main form first — the AI needs it to
            ground the question in the scene.
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
              Image URL
            </p>
            <p className="text-xs text-gray-700 truncate">{sp.imageUrl}</p>
          </div>
        )}

        {/* Quick chips — hazard scenario starters */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Common hazards
          </p>
          <div className="flex flex-wrap gap-2">
            {HAZARD_CHIPS.map((text) => (
              <button
                key={text}
                onClick={() => sp.onChipClick(text)}
                disabled={sp.busy !== null || !sp.imageUrl}
                className="text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {/* Free-text focus */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Describe the developing hazard
          </p>
          <textarea
            value={sp.focus}
            onChange={(e) => sp.setFocus(e.target.value)}
            placeholder="e.g. Cyclist wobbling near a parked van's door"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sp.onGenerateSingle}
            disabled={sp.busy !== null || !sp.imageUrl}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {sp.busy === "single" ? "Generating..." : "Generate hazard question"}
          </button>
        </div>

        {/* Improve */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Improve my draft
          </p>
          <button
            onClick={sp.onImprove}
            disabled={sp.busy !== null || !sp.hasCurrentDraft || !sp.imageUrl}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <SparkleIcon className="w-4 h-4" />
            {sp.busy === "improve" ? "Polishing..." : "Polish my current draft"}
          </button>
        </div>
      </>
    );
  }
}

// ---------------------------------------------------------------------------
// Result cards — rendered when a draft comes back. Clean enough that the
// admin can eyeball-validate and either apply or regenerate.
// ---------------------------------------------------------------------------

function TheoryDraftCard(props: {
  draft: TheoryQuestionDraft;
  onApply: () => void;
  onRegenerate?: () => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const { draft, onApply, onRegenerate, busy, compact } = props;
  const letters: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
  const optionByLetter = {
    a: draft.optionA,
    b: draft.optionB,
    c: draft.optionC,
    d: draft.optionD,
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full mb-2">
            {draft.category}
          </span>
          <p className={compact ? "text-sm text-gray-900" : "text-sm font-semibold text-gray-900"}>
            {draft.questionText}
          </p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {letters.map((l) => (
          <li
            key={l}
            className={`flex items-start gap-2 text-xs rounded-md px-2 py-1.5 ${
              l === draft.correctOption
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-gray-50 text-gray-700 border border-gray-100"
            }`}
          >
            <span className="font-bold uppercase">{l}.</span>
            <span>{optionByLetter[l]}</span>
            {l === draft.correctOption && (
              <span className="ml-auto text-[10px] font-semibold uppercase">
                correct
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onApply}
          disabled={busy}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          Use this draft
        </button>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={busy}
            className="text-xs font-medium text-gray-600 hover:text-gray-800 px-3 py-2 disabled:opacity-50"
          >
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}

function HazardDraftCard(props: {
  draft: HazardQuestionDraft;
  onApply: () => void;
  onRegenerate: () => void;
  busy?: boolean;
}) {
  const { draft, onApply, onRegenerate, busy } = props;
  const letters: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
  const optionByLetter = {
    a: draft.optionA,
    b: draft.optionB,
    c: draft.optionC,
    d: draft.optionD,
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">{draft.questionText}</p>

      <ul className="space-y-1.5">
        {letters.map((l) => (
          <li
            key={l}
            className={`flex items-start gap-2 text-xs rounded-md px-2 py-1.5 ${
              l === draft.correctOption
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-gray-50 text-gray-700 border border-gray-100"
            }`}
          >
            <span className="font-bold uppercase">{l}.</span>
            <span>{optionByLetter[l]}</span>
            {l === draft.correctOption && (
              <span className="ml-auto text-[10px] font-semibold uppercase">
                correct
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
        <p className="text-xs font-semibold text-amber-800 mb-0.5">
          Explanation shown after submit
        </p>
        <p className="text-xs text-amber-900 leading-relaxed">
          {draft.description}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onApply}
          disabled={busy}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          Use this draft
        </button>
        <button
          onClick={onRegenerate}
          disabled={busy}
          className="text-xs font-medium text-gray-600 hover:text-gray-800 px-3 py-2 disabled:opacity-50"
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared error extractor — keeps the call-sites tidy.
// ---------------------------------------------------------------------------

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error ?? fallback
  );
}

// Re-export the ImproveKind type so future callers of the "improve" endpoint
// from other places (e.g. a future inline "✨ fix this field" button on the
// admin forms) can import it alongside this component.
export type { ImproveKind };
