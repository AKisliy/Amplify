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
      const response = await refreshToken();

      if (response) {
        setUser(response.user);
      } else {
        setUser(null);
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (payload: LoginPayload) => {
    const response = await loginService(payload);
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  };

  const refresh = async () => {
    const response = await refreshToken();

    if (response) {
      setUser(response.user);
    } else {
      setUser(null);
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
