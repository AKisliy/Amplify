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
  logout as logoutService,
} from "../services/auth.service";
import { decodeJwt } from "@/lib/jwt";

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
          let parsedUser = JSON.parse(storedUser);
          
          // Enhanced: if user info is incomplete, reconstruct from token
          const decoded = decodeJwt(storedToken);
          if (decoded) {
            const email = decoded.email || 
                          decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
                          decoded.name ||
                          parsedUser.email;
            
            const id = decoded.sub || 
                       decoded.id || 
                       decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
                       parsedUser.id;

            if (email !== parsedUser.email || id !== parsedUser.id) {
              parsedUser = { ...parsedUser, email, id };
              localStorage.setItem("auth_user", JSON.stringify(parsedUser));
            }
          }
          
          setUser(parsedUser);
          console.log("AuthProvider: Session restored", parsedUser.email);
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

    // Backend LoginResponse only contains AccessToken and RefreshToken (usually PascalCase in .NET)
    const accessToken = (response as any).accessToken || (response as any).AccessToken;
    const refreshToken = (response as any).refreshToken || (response as any).RefreshToken;

    if (!accessToken) {
      throw new Error("Login failed: Access token missing in response");
    }

    // Decode JWT to get user info since it's not in the response body
    const decoded = decodeJwt(accessToken);
    if (!decoded) {
      throw new Error("Failed to decode session token");
    }

    const email = decoded.email ||
                  decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
                  decoded.name;
    const id = decoded.sub ||
               decoded.id ||
               decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

    const user: AuthUser = {
      id: id || "unknown-id",
      email: email || payload.email, // Fallback to login email
      emailConfirmed: true
    };

    console.log("AuthProvider: Login successful", user.email);

    setUser(user);
    localStorage.setItem("auth_user", JSON.stringify(user));
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  };

  const logout = async () => {
    try {
      await logoutService();
    } catch (e) {
      console.error("AuthProvider: Logout service call failed", e);
    } finally {
      setUser(null);
      localStorage.removeItem("auth_user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
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
