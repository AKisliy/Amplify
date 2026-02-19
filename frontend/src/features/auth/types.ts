// =====================
// Request payloads
// =====================

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  resetCode: string;
  newPassword: string;
}

// =====================
// Query parameters
// =====================

export interface ConfirmEmailParams {
  userId: string;
  code: string;
}

// =====================
// Auth user
// =====================

export interface AuthUser {
  id: string;
  email: string;
  emailConfirmed: boolean;
}

// =====================
// API responses
// =====================

export interface AuthResponse {
  id: string;
  email: string;
  roles: string[];
  accessToken: string;
  refreshToken: string;
}

export interface ApiSuccessResponse {
  success: boolean;
  message?: string;
}
