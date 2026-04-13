/**
 * AuthProvider — the single source of auth state for the entire React app.
 *
 * Wraps the component tree (via App.tsx root layout route) and provides:
 *   - user / token / loading state
 *   - login()    — POST /api/auth/login   → sets state + localStorage
 *   - register() — POST /api/auth/register → does NOT set state (account is
 *                  unverified; user must enter the signup OTP first)
 *   - logout()   — clears state + localStorage
 *
 * State is persisted in localStorage so a page refresh re-hydrates the session.
 *
 * Data flow:
 *   Component calls login() → Axios POST → Backend validates credentials →
 *   Returns { token, user } → Provider stores in state + localStorage →
 *   Downstream components re-render with the new user.
 */

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import api from "../api";
import type { AuthResponse, RegisterResponse, Role, User } from "../types";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Rehydrate from localStorage on mount. If the stored blob is malformed,
  // clear it and start clean — better than throwing at startup.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as User);
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, []);

  // ---------------------------------------------------------------------------
  // login — authenticates and stores the session.
  // ---------------------------------------------------------------------------
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>("/api/auth/login", {
        email,
        password,
      });
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      // Return the user so the caller (Login page) can pick a role-specific
      // destination without racing the setState commit.
      return newUser;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // register — creates the account but does NOT log in.
  //
  // The account starts as unverified. The backend sends a signup OTP email.
  // The Register page should redirect to /verify-otp after a successful call.
  // ---------------------------------------------------------------------------
  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: Role,
      location?: string
    ) => {
      setLoading(true);
      try {
        await api.post<RegisterResponse>("/api/auth/register", {
          name,
          email,
          password,
          role,
          location,
        });
        // Return the email so the page can pass it to the verify-otp route.
        return { email };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // logout — wipes everything.
  // ---------------------------------------------------------------------------
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
