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
  message: string;
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

// Hazard perception quiz types

export type HazardQuestion = {
  id: number;
  imageUrl: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

export type HazardAnswerResult = {
  questionId: number;
  selected: string;
  correctOption: string;
  isCorrect: boolean;
  description: string;
};

export type HazardSubmitResult = {
  score: number;
  total: number;
  passed: boolean;
  results: HazardAnswerResult[];
};

// Instructor / marketplace types

export type InstructorProfile = {
  bio: string | null;
  location: string;
  hourlyRate: number;
};

export type PublicInstructor = {
  id: number;
  name: string;
  profile: InstructorProfile;
};

export type AvailabilitySlot = {
  id: number;
  slotDate: string;
  startTime: string;
  endTime: string;
};

export type InstructorWithSlots = PublicInstructor & {
  availability: AvailabilitySlot[];
};

// Availability management (instructor side — includes isBooked flag)

export type ManagedSlot = AvailabilitySlot & {
  instructorId: number;
  isBooked: boolean;
};

// Booking types

export type BookingRow = {
  id: number;
  status: string;
  createdAt: string;
  instructor: { id: number; name: string };
  availability: AvailabilitySlot;
};

export type InstructorBookingRow = {
  id: number;
  status: string;
  createdAt: string;
  learner: { id: number; name: string };
  availability: AvailabilitySlot;
};

// Progress types

export type TestResultRow = {
  id: number;
  type: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  timeTakenSeconds: number | null;
  takenAt: string;
};

export type TypeStats = {
  attempts: number;
  passed: number;
  passRate: number;
  avgScorePct: number;
  bestScorePct: number;
  latest: TestResultRow | null;
};

export type ProgressSummary = {
  results: TestResultRow[];
  stats: {
    theory: TypeStats;
    hazard: TypeStats;
    overall: { attempts: number; passed: number; passRate: number };
  };
};

// Admin learners types

export type AdminLearnerRow = {
  id: number;
  name: string;
  email: string;
  location: string | null;
  createdAt: string;
  _count: { testResults: number };
};

// Admin theory/hazard question types (includes all fields)

export type AdminTheoryQuestion = {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  category: string;
};

export type AdminHazardQuestion = {
  id: number;
  imageUrl: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  description: string;
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
