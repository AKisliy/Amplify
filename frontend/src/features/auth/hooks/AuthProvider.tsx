"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import {
  login as loginService,
  refreshToken,
  getMe,
} from "../services/auth.service";

import { AuthUser, LoginPayload } from "../types";
import { buildAuthState } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      console.log("AuthProvider: Attempting to restore session...");
      
      // Try to restore from localStorage first (fallback for unstable backend)
      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log("AuthProvider: Restored from localStorage", parsedUser);
          setUser(parsedUser);
          setIsLoading(false);
          return;
        } catch (e) {
          localStorage.removeItem("auth_user");
        }
      }

      const response = await refreshToken();

      if (response) {
        console.log("AuthProvider: Session restored successfully", response.user);
        setUser(response.user);
        // Sync successful backend session to local storage
        localStorage.setItem("auth_user", JSON.stringify(response.user));
      } else {
        console.log("AuthProvider: No session found");
        setUser(null);
        localStorage.removeItem("auth_user");
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (payload: LoginPayload) => {
    console.log("AuthProvider: Logging in...");
    const response = await loginService(payload);
    console.log("AuthProvider: Login successful", response.user);
    setUser(response.user);
    // Persist to local storage
    localStorage.setItem("auth_user", JSON.stringify(response.user));
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      localStorage.removeItem("auth_user");
    }
  };

  const refresh = async () => {
    // Try localStorage first to prevent flickering
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
        setUser(JSON.parse(storedUser));
        return;
    }

    const response = await refreshToken();

    if (response) {
      setUser(response.user);
      localStorage.setItem("auth_user", JSON.stringify(response.user));
    } else {
      setUser(null);
      localStorage.removeItem("auth_user");
    }
  };

  const authState = buildAuthState(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: authState.isAuthenticated,
        isLoading,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
