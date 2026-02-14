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

      const storedUser = localStorage.getItem("auth_user");
      const storedToken = localStorage.getItem("accessToken");

      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // Verify session with backend
          try {
            // getMe will trigger refresh via interceptor if needed
            const { user: freshUser } = await getMe();
            setUser(freshUser);
            localStorage.setItem("auth_user", JSON.stringify(freshUser));
          } catch (err) {
            console.log("AuthProvider: Session validation failed", err);
            // If validation fails (and refresh fails), clear session
            // But maybe we are offline? Optimistically keep user if not 401?
            // Interceptor handles 401 by clearing everything.
          }
        } catch (e) {
          console.log("AuthProvider: Error parsing stored user", e);
          localStorage.removeItem("auth_user");
        }
      } else {
        // No token, clear everything just in case
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
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

    const { user, accessToken, refreshToken } = response;

    setUser(user);
    localStorage.setItem("auth_user", JSON.stringify(user));
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    // Optional: Call backend logout if needed
    try {
      // await api.post("/auth/logout");
    } catch (e) {
      // ignore
    }
  };

  const refresh = async () => {
    // Manual refresh if needed, largely handled by interceptor
    // But we can reload user from storage
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
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
