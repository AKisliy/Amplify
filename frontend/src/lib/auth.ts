import { AuthUser } from "@/features/auth/types";

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

export const buildAuthState = (user: AuthUser | null): AuthState => {
  return {
    user,
    isAuthenticated: Boolean(user),
  };
};
