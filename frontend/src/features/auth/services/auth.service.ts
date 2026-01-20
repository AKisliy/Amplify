import api from "@/lib/axios";
import {
  RegisterPayload,
  LoginPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ConfirmEmailParams,
  AuthResponse,
  ApiSuccessResponse,
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

export const refreshToken = async (): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>(`${AUTH_BASE}/refresh`);
  return data;
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
  const { data } = await api.get<AuthResponse>("/users/me");
  return data;
};
