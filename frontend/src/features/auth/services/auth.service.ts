import api from "@/lib/axios";
import { decodeJwt } from "@/lib/jwt";
import {
  RegisterPayload,
  LoginPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ConfirmEmailParams,
  AuthResponse,
  ApiSuccessResponse,
  AuthUser,
} from "../types";

const AUTH_BASE = "/auth";

// =====================
// Register
// =====================

export const register = async (
  payload: RegisterPayload,
): Promise<ApiSuccessResponse> => {
  const { data } = await api.post<ApiSuccessResponse>(
    `${AUTH_BASE}/register`,
    payload,
  );
  return data;
};

// =====================
// Confirm email
// =====================

export const confirmEmail = async (
  params: ConfirmEmailParams,
): Promise<ApiSuccessResponse> => {
  const { data } = await api.get<ApiSuccessResponse>(
    `${AUTH_BASE}/confirm-email`,
    { params },
  );
  return data;
};

// =====================
// Login
// =====================

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>(`${AUTH_BASE}/login`, payload);
  return data;
};

// =====================
// Refresh token
// =====================

export const refreshToken = async (): Promise<AuthResponse | null> => {
  try {
    const currentRefreshToken = localStorage.getItem("refreshToken");
    if (!currentRefreshToken) return null;

    const { data } = await api.post<AuthResponse>(
      `${AUTH_BASE}/refresh`,
      { refreshToken: currentRefreshToken }
    );

    return data;
  } catch (error: any) {
    if (error?.response?.status === 401) {
      return null;
    }
    throw error;
  }
};

// =====================
// Forgot password
// =====================

export const forgotPassword = async (
  payload: ForgotPasswordPayload,
): Promise<ApiSuccessResponse> => {
  const { data } = await api.post<ApiSuccessResponse>(
    `${AUTH_BASE}/forgot-password`,
    payload,
  );
  return data;
};

// =====================
// Reset password
// =====================

export const resetPassword = async (
  payload: ResetPasswordPayload,
): Promise<ApiSuccessResponse> => {
  const { data } = await api.post<ApiSuccessResponse>(
    `${AUTH_BASE}/reset-password`,
    payload,
  );
  return data;
};

// =====================
// Get current user
// =====================

export const getMe = async (): Promise<AuthResponse> => {
  // Since the backend does not have a dedicated /me endpoint, 
  // we return null or handle this differently in the provider.
  // For now, let's just throw to signal it's not available, 
  // or if the provider expects it to confirm session validity, 
  // we might need to rely on token validation or a lightweight call.
  throw new Error("Endpoint /users/me not implemented");
};
