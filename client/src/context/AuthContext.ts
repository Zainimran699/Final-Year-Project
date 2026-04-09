import { createContext } from "react";
import type { Role, User } from "../types";

export type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  // login/register return the freshly-authed User so callers can route by
  // role on the same tick. Relying on useAuth().user immediately after the
  // await would race the setState commit (React closure) and see stale data.
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    role: Role
  ) => Promise<User>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
