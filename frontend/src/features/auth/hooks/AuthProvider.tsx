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
          // Verify session validity by checking token expiration locally if possible,
          // or just assume valid until 401. 
          // Since /users/me is not available, we rely on the stored user and token.
          // The Axios interceptor will handle 401s if the token is invalid/expired.
          setUser(parsedUser);
          console.log("AuthProvider: Session restored from storage");
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

    const { accessToken, refreshToken, ...userData } = response;
    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      emailConfirmed: true // If they can login, email is confirmed or allowed
    };

    console.log("AuthProvider: Login successful", user);

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
