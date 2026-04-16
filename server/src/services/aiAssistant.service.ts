/**
 * aiAssistant.service — Gemini-backed draft generation for the admin panel.
 *
 * What this module does:
 *   - Generate a single theory-question draft (questionText + 4 options +
 *     correctOption + category) from a free-text admin prompt.
 *   - Generate a small batch of theory drafts for a theme (e.g. "3 new
 *     questions about motorway lane discipline").
 *   - Generate a hazard-question draft (questionText + options + correct
 *     option + description) from an image URL and/or focus hint.
 *   - Polish / rewrite a single field (question wording, a distractor,
 *     a hazard description) while preserving its intent.
 *
 * How it fits into the system:
 *   Routes live under `/api/admin/ai/*` (admin-only by the router-level
 *   middleware in [admin.routes.ts]). Drafts are *never* persisted by this
 *   service — they're returned to the client so an admin can review, edit,
 *   and explicitly save via the existing `/api/admin/theory` / `/hazard`
 *   CRUD endpoints. That separation keeps the AI strictly in an advisory
 *   role and preserves the audit trail through the CRUD routes.
 *
 * Caching:
 *   We deliberately do NOT cache admin drafts. Unlike learner-facing
 *   explanations (which are stable for a given <question, wrong answer>
 *   pair and therefore cached in AIExplanation — see theory.service.ts
 *   and CLAUDE.md §7.4), admin prompts are free-text and the whole point
 *   is for the admin to ask "give me a different one" — a cache would
 *   sabotage that UX. Free-tier quota is a non-concern because admin
 *   traffic is tiny.
 *
 * Structured output:
 *   Every Gemini call uses `responseMimeType: "application/json"` plus a
 *   strict `responseSchema` so the model is *forced* to return an object
 *   with exactly the fields we need. This avoids fragile prompt-based
 *   JSON coercion and eliminates a whole class of "the model said 'Sure!
 *   Here's the JSON…'" parsing bugs.
 *
 * Error handling:
 *   Throws custom error classes (ValidationError, UpstreamAIError) that
 *   the controller maps to HTTP codes. Gemini fetch errors are wrapped
 *   in UpstreamAIError so the controller always returns 503 for upstream
 *   issues (matches the theory.controller.explainAnswer pattern).
 */

import { geminiModel } from "../lib/gemini";

// -------------------------------------------------------------------------
// Error classes — mirror the ValidationError / NotFoundError pattern used
// across the rest of the services/ directory (see theory.service.ts).
// -------------------------------------------------------------------------

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Raised when Gemini itself errors (quota exhausted, network flake, 4xx
 * from Google). The controller maps this to HTTP 503 so the admin UI can
 * show a friendly "try again" message instead of an opaque 500.
 */
export class UpstreamAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamAIError";
  }
}

// -------------------------------------------------------------------------
// Draft shapes returned to the client. These match AdminTheoryQuestion /
// AdminHazardQuestion in client/src/types.ts MINUS the `id` field, since
// drafts aren't persisted. The admin reviews the draft, tweaks it, then
// hits Save which goes through the existing CRUD endpoints.
// -------------------------------------------------------------------------

export type TheoryQuestionDraft = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  category: string;
};

export type HazardQuestionDraft = {
  imageUrl: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  description: string;
};

// -------------------------------------------------------------------------
// Shared helpers
// -------------------------------------------------------------------------

const VALID_CORRECT_OPTIONS = ["a", "b", "c", "d"] as const;

// The four DriveReady221 theory categories. Kept here so the AI always
// picks from the same set the admin panel UI uses.
const THEORY_CATEGORIES = [
  "Road Signs",
  "Speed Limits",
  "Safety",
  "Motorway Rules",
] as const;

/**
 * Run a structured Gemini generation and return the parsed JSON payload.
 *
 * Why this helper: every call-site wants the exact same pattern — build
 * a prompt, force JSON output, parse, validate. Centralising keeps the
 * error handling and model config in one place.
 */
async function generateStructured<T>(
  prompt: string,
  responseSchema: Record<string, unknown>
): Promise<T> {
  try {
    // The SDK types `responseSchema` as a narrow discriminated union
    // (`Schema`), but the underlying REST API accepts any JSON-schema-ish
    // object. We build the schemas as plain objects (see below) for
    // readability and cast the whole request shape here — this is the
    // recommended escape hatch per the @google/generative-ai docs.
    const request = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        // JSON mode — Gemini will refuse to output anything but a JSON
        // object matching the schema. No more "Sure, here's the JSON"
        // preamble to strip.
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8,
      },
    } as unknown as Parameters<typeof geminiModel.generateContent>[0];

    const result = await geminiModel.generateContent(request);

    const raw = result.response.text().trim();
    if (!raw) {
      throw new UpstreamAIError("AI returned an empty response");
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      // JSON mode should prevent this, but belt-and-braces: if the model
      // somehow returned malformed JSON, surface it as an upstream error
      // rather than a 500.
      throw new UpstreamAIError("AI returned unparsable JSON");
    }
  } catch (err) {
    // Re-throw our own error classes untouched.
    if (err instanceof UpstreamAIError || err instanceof ValidationError) {
      throw err;
    }
    // Anything from Gemini itself (quota, 4xx, network) becomes an
    // UpstreamAIError. The controller maps this to HTTP 503.
    const name = (err as { constructor?: { name?: string } }).constructor?.name;
    if (name?.startsWith("GoogleGenerativeAI")) {
      throw new UpstreamAIError(
        "AI assistant is temporarily unavailable. Please try again later."
      );
    }
    throw err;
  }
}

/**
 * Validate a raw draft object against the expected shape, throwing
 * ValidationError on any problem. Catches malformed model output before
 * it can confuse the admin form.
 */
function assertValidTheoryDraft(
  d: Partial<TheoryQuestionDraft>
): asserts d is TheoryQuestionDraft {
  const required: (keyof TheoryQuestionDraft)[] = [
    "questionText",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "correctOption",
    "category",
  ];
  for (const key of required) {
    if (typeof d[key] !== "string" || !d[key]) {
      throw new ValidationError(`AI draft missing field: ${key}`);
    }
  }
  if (
    !VALID_CORRECT_OPTIONS.includes(
      d.correctOption as (typeof VALID_CORRECT_OPTIONS)[number]
    )
  ) {
    throw new ValidationError("correctOption must be one of a/b/c/d");
  }
}

function assertValidHazardDraft(
  d: Partial<HazardQuestionDraft>
): asserts d is HazardQuestionDraft {
  const required: (keyof HazardQuestionDraft)[] = [
    "imageUrl",
    "questionText",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "correctOption",
    "description",
  ];
  for (const key of required) {
    if (typeof d[key] !== "string" || !d[key]) {
      throw new ValidationError(`AI draft missing field: ${key}`);
    }
  }
  if (
    !VALID_CORRECT_OPTIONS.includes(
      d.correctOption as (typeof VALID_CORRECT_OPTIONS)[number]
    )
  ) {
    throw new ValidationError("correctOption must be one of a/b/c/d");
  }
}

// -------------------------------------------------------------------------
// Theory question — single draft
// -------------------------------------------------------------------------

const theoryResponseSchema = {
  type: "object",
  properties: {
    questionText: { type: "string" },
    optionA: { type: "string" },
    optionB: { type: "string" },
    optionC: { type: "string" },
    optionD: { type: "string" },
    correctOption: { type: "string", enum: ["a", "b", "c", "d"] },
    category: {
      type: "string",
      enum: [...THEORY_CATEGORIES],
    },
  },
  required: [
    "questionText",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "correctOption",
    "category",
  ],
};

export type GenerateTheoryInput = {
  /** Free-text topic or hint — e.g. "motorway slip roads" or "give way signs". */
  topic?: string;
  /** Optional category lock — if omitted, the AI picks the best fit. */
  category?: string;
  /** Optional existing draft to polish / rephrase instead of generating from scratch. */
  improve?: Partial<TheoryQuestionDraft>;
};

function buildTheoryPrompt(input: GenerateTheoryInput): string {
  const { topic, category, improve } = input;

  const base = `You are an expert at authoring UK driving theory test questions for learner drivers.
The platform is DriveReady221. Questions are multiple-choice with exactly 4 options labelled a, b, c, d.
There must be exactly one correct option.
The category must be one of: ${THEORY_CATEGORIES.join(", ")}.
Write in British English. Keep the question under 30 words. Keep each option under 15 words.
Do not mention the answer inside the question. Make the distractors plausible but clearly wrong to a prepared learner.`;

  if (improve) {
    return `${base}

An admin has drafted the following question and wants you to IMPROVE it — tighten the wording, fix any grammar, and make the distractors more plausible while PRESERVING the intent and the correct answer.

Existing draft (may have missing fields):
${JSON.stringify(improve, null, 2)}

Return an improved, complete question as JSON.`;
  }

  const topicLine = topic
    ? `The question should be about: "${topic}".`
    : "Pick a common, exam-relevant UK driving concept.";
  const categoryLine = category
    ? `Use category: "${category}".`
    : "Choose the most appropriate category.";

  return `${base}

${topicLine}
${categoryLine}

Return a single question as JSON.`;
}

export async function generateTheoryQuestion(
  input: GenerateTheoryInput
): Promise<TheoryQuestionDraft> {
  // Validation — category (if given) must be one of the known four.
  if (
    input.category &&
    !THEORY_CATEGORIES.includes(
      input.category as (typeof THEORY_CATEGORIES)[number]
    )
  ) {
    throw new ValidationError(
      `category must be one of: ${THEORY_CATEGORIES.join(", ")}`
    );
  }

  const prompt = buildTheoryPrompt(input);
  const draft = await generateStructured<Partial<TheoryQuestionDraft>>(
    prompt,
    theoryResponseSchema
  );
  assertValidTheoryDraft(draft);
  return draft;
}

// -------------------------------------------------------------------------
// Theory question — batch (cap at MAX_BATCH to protect the free-tier quota)
// -------------------------------------------------------------------------

const MAX_BATCH = 5;

const theoryBatchResponseSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: theoryResponseSchema,
    },
  },
  required: ["questions"],
};

export type GenerateTheoryBatchInput = {
  topic: string;
  count: number;
  category?: string;
};

export async function generateTheoryBatch(
  input: GenerateTheoryBatchInput
): Promise<TheoryQuestionDraft[]> {
  if (!input.topic || typeof input.topic !== "string") {
    throw new ValidationError("topic is required");
  }
  if (
    typeof input.count !== "number" ||
    input.count < 1 ||
    input.count > MAX_BATCH
  ) {
    throw new ValidationError(`count must be an integer between 1 and ${MAX_BATCH}`);
  }
  if (
    input.category &&
    !THEORY_CATEGORIES.includes(
      input.category as (typeof THEORY_CATEGORIES)[number]
    )
  ) {
    throw new ValidationError(
      `category must be one of: ${THEORY_CATEGORIES.join(", ")}`
    );
  }

  const prompt = `You are an expert at authoring UK driving theory test questions for learner drivers.
The platform is DriveReady221. Each question must have exactly 4 multiple-choice options labelled a, b, c, d, with exactly one correct answer.
The category must be one of: ${THEORY_CATEGORIES.join(", ")}.
Write in British English. Keep each question under 30 words and each option under 15 words. Vary the correct answer letter so it's not always 'a'. Make distractors plausible but clearly wrong to a prepared learner.

Generate exactly ${input.count} DISTINCT questions about: "${input.topic}".${
    input.category ? ` All questions must use the category "${input.category}".` : ""
  }

Return them as a JSON object with a "questions" array.`;

  const response = await generateStructured<{
    questions: Partial<TheoryQuestionDraft>[];
  }>(prompt, theoryBatchResponseSchema);

  if (!Array.isArray(response.questions)) {
    throw new UpstreamAIError("AI returned an invalid batch response");
  }

  // Validate each draft individually. A single bad one isn't fatal — drop
  // it and return the rest, but if they're ALL bad, something is up.
  const valid: TheoryQuestionDraft[] = [];
  for (const d of response.questions) {
    try {
      assertValidTheoryDraft(d);
      valid.push(d);
    } catch {
      // silently skip malformed entries
    }
  }
  if (valid.length === 0) {
    throw new UpstreamAIError("AI returned no usable questions");
  }
  return valid;
}

// -------------------------------------------------------------------------
// Hazard question — single draft (from image URL + focus hint)
// -------------------------------------------------------------------------

const hazardResponseSchema = {
  type: "object",
  properties: {
    imageUrl: { type: "string" },
    questionText: { type: "string" },
    optionA: { type: "string" },
    optionB: { type: "string" },
    optionC: { type: "string" },
    optionD: { type: "string" },
    correctOption: { type: "string", enum: ["a", "b", "c", "d"] },
    description: { type: "string" },
  },
  required: [
    "imageUrl",
    "questionText",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "correctOption",
    "description",
  ],
};

export type GenerateHazardInput = {
  /** Required. The image URL the question is about. */
  imageUrl: string;
  /**
   * Optional hint about what the hazard is (e.g. "pedestrian stepping out",
   * "cyclist on the inside"). The AI uses it to frame the question — it
   * cannot actually see the image in text-only mode.
   */
  focus?: string;
  /** Optional existing draft to polish instead of generating from scratch. */
  improve?: Partial<HazardQuestionDraft>;
};

function buildHazardPrompt(input: GenerateHazardInput): string {
  const { imageUrl, focus, improve } = input;

  const base = `You are an expert at authoring UK hazard perception test questions for learner drivers.
The platform is DriveReady221. Questions are multiple-choice with exactly 4 options labelled a, b, c, d, with exactly one correct answer.
Each question also has a "description" field (1-2 sentences) shown to the learner AFTER they submit, explaining WHY the correct answer is the developing hazard.
Write in British English. The question text itself should be under 25 words. Each option must describe a plausible hazard or road user.`;

  if (improve) {
    return `${base}

An admin has drafted the following hazard question and wants you to IMPROVE it — tighten the wording, make distractors more plausible, and rewrite the description to be clearer. PRESERVE the intent and the correct answer.

Existing draft:
${JSON.stringify(improve, null, 2)}

The image URL is: ${imageUrl}

Return the improved question as JSON. Keep the "imageUrl" field equal to the input image URL.`;
  }

  const focusLine = focus
    ? `The developing hazard in the scene is: "${focus}".`
    : "Infer a plausible developing hazard from a typical UK driving scene.";

  return `${base}

${focusLine}
The image URL is: ${imageUrl}

Generate one hazard perception question as JSON. Set "imageUrl" exactly to: ${imageUrl}`;
}

export async function generateHazardQuestion(
  input: GenerateHazardInput
): Promise<HazardQuestionDraft> {
  if (!input.imageUrl || typeof input.imageUrl !== "string") {
    throw new ValidationError("imageUrl is required");
  }

  const prompt = buildHazardPrompt(input);
  const draft = await generateStructured<Partial<HazardQuestionDraft>>(
    prompt,
    hazardResponseSchema
  );

  // Force imageUrl back to the admin-supplied value — don't trust the model
  // to echo a long URL character-for-character.
  draft.imageUrl = input.imageUrl;

  assertValidHazardDraft(draft);
  return draft;
}

// -------------------------------------------------------------------------
// Generic polish — rephrase a single field (question wording, a distractor,
// a hazard description). Used by the "✨ Improve this wording" button.
// -------------------------------------------------------------------------

const improveTextSchema = {
  type: "object",
  properties: { improved: { type: "string" } },
  required: ["improved"],
};

export type ImproveTextInput = {
  /** The current text the admin wants polished. */
  value: string;
  /** What kind of field it is — used to steer the tone. */
  kind: "theory-question" | "theory-option" | "hazard-question" | "hazard-description" | "generic";
  /** Optional surrounding context (the other question fields) so the AI understands intent. */
  context?: string;
};

export async function improveText(
  input: ImproveTextInput
): Promise<{ improved: string }> {
  if (!input.value || typeof input.value !== "string") {
    throw new ValidationError("value is required");
  }

  const kindGuidance: Record<ImproveTextInput["kind"], string> = {
    "theory-question":
      "This is the body of a UK driving theory test question. Keep it under 30 words, British English, clear and unambiguous.",
    "theory-option":
      "This is one multiple-choice option for a UK driving theory test question. Keep it under 15 words and in the same grammatical form as a typical answer option.",
    "hazard-question":
      "This is a hazard perception test question about a driving scene. Keep it under 25 words and focused on spotting developing hazards.",
    "hazard-description":
      "This is the post-submission explanation of a hazard perception answer. 1-2 clear sentences explaining why the correct answer is the developing hazard.",
    generic: "Tighten the wording while preserving meaning.",
  };

  const prompt = `Polish the following text. ${kindGuidance[input.kind]}
Preserve the meaning exactly — do NOT change the answer or introduce new facts.
Return JSON with a single field "improved".

${input.context ? `Context:\n${input.context}\n\n` : ""}Text to polish:
${input.value}`;

  const response = await generateStructured<{ improved: string }>(
    prompt,
    improveTextSchema
  );
  if (typeof response.improved !== "string" || !response.improved.trim()) {
    throw new UpstreamAIError("AI returned an empty improvement");
  }
  return { improved: response.improved.trim() };
}
