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
