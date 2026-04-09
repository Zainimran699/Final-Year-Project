export type Role = "learner" | "instructor" | "admin";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type RegisterResponse = {
  user: User;
};

// Theory quiz — matches PublicTheoryQuestion on the server (no correctOption).
export type TheoryQuestion = {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  category: string;
};

export type OptionKey = "a" | "b" | "c" | "d";

export type TheorySubmitAnswer = {
  questionId: number;
  selected: OptionKey;
};

export type TheoryAnswerResult = {
  questionId: number;
  selected: OptionKey;
  correctOption: OptionKey;
  isCorrect: boolean;
};

export type TheorySubmitResult = {
  score: number;
  total: number;
  passed: boolean;
  results: TheoryAnswerResult[];
};

export type TheoryExplainResponse = {
  cached: boolean;
  explanation: string;
};

// Single source of truth for "where does this role live?"
// Used by Login, Register, RequireRole's mismatch fallback, and PlaceholderPage's
// "Back to Dashboard" button. If a new role is ever added, only this function
// needs to change.
export function dashboardPathForRole(role: Role): string {
  switch (role) {
    case "learner":
      return "/dashboard";
    case "instructor":
      return "/instructor/dashboard";
    case "admin":
      return "/admin/dashboard";
  }
}
