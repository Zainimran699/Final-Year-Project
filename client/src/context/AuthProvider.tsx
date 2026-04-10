import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import api from "../api";
import type { AuthResponse, RegisterResponse, Role, User } from "../types";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Rehydrate from localStorage on mount. If the blob is malformed, clear it
  // and start clean — better than throwing at startup.
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

  const register = useCallback(
    async (name: string, email: string, password: string, role: Role, location?: string) => {
      setLoading(true);
      try {
        // Backend returns { user } only on register (no token), so we
        // immediately follow up with a login using the same credentials
        // to avoid a redundant form.
        await api.post<RegisterResponse>("/api/auth/register", {
          name,
          email,
          password,
          role,
          location,
        });
        const res = await api.post<AuthResponse>("/api/auth/login", {
          email,
          password,
        });
        const { token: newToken, user: newUser } = res.data;
        localStorage.setItem("token", newToken);
        localStorage.setItem("user", JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
        return newUser;
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
