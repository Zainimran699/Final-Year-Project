/**
 * Auth context definition — createContext + the AuthContextValue type.
 *
 * This file is intentionally JSX-free (no components, no hooks that aren't
 * createContext) to satisfy ESLint's react-refresh/only-export-components rule.
 *
 * The actual Provider is in AuthProvider.tsx; the consumer hook is in useAuth.ts.
 */

import { createContext } from "react";
import type { Role, User } from "../types";

export type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;

  /**
   * Log in with email + password. Returns the freshly-authed User so callers
   * can route by role on the same tick without racing setState.
   */
  login: (email: string, password: string) => Promise<User>;

  /**
   * Register a new account. Does NOT auto-login because the account must be
   * verified via email OTP first. Returns { email } so the caller can
   * redirect to the OTP verification page with the email pre-filled.
   */
  register: (
    name: string,
    email: string,
    password: string,
    role: Role,
    location?: string
  ) => Promise<{ email: string }>;

  /** Clear all auth state and localStorage. */
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
