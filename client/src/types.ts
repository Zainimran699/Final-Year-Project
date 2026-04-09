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
