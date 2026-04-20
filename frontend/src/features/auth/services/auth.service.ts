import { decodeJwt } from "@/lib/jwt";
import {
  postApiAuthRegister,
  getApiAuthConfirmEmail,
  loginUser,
  refreshToken as refreshTokenSdk,
  postApiAuthForgotPassword,
  postApiAuthResetPassword,
  postApiAuthLogout,
} from "@/lib/api/userservice";
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

// =====================
// Register
// =====================

export const register = async (
  payload: RegisterPayload,
): Promise<ApiSuccessResponse> => {
  await postApiAuthRegister({ body: { email: payload.email, password: payload.password } });
  return { success: true };
};

// =====================
// Confirm email
// =====================

export const confirmEmail = async (
  params: ConfirmEmailParams,
): Promise<ApiSuccessResponse> => {
  await getApiAuthConfirmEmail({ query: { UserId: params.userId, Code: params.code } });
  return { success: true };
};

// =====================
// Login
// =====================

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const { data } = await loginUser({
    body: { email: payload.email, password: payload.password },
  });
  // Map generated LoginResponse → local AuthResponse shape
  const accessToken = data?.accessToken ?? "";
  const refreshToken = data?.refreshToken ?? "";
  const decoded = decodeJwt(accessToken);
  return {
    id: decoded?.sub ?? decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? "",
    email: decoded?.email ?? decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ?? payload.email,
    roles: (decoded?.role as string[] | string | undefined)
      ? [].concat(decoded.role as any)
      : [],
    accessToken,
    refreshToken,
  };
};

// =====================
// Refresh token
// =====================

export const refreshToken = async (): Promise<AuthResponse | null> => {
  try {
    const currentRefreshToken = localStorage.getItem("refreshToken");
    const currentAccessToken = localStorage.getItem("accessToken");
    if (!currentRefreshToken || !currentAccessToken) return null;

    const { data } = await refreshTokenSdk({
      body: { accessToken: currentAccessToken, refreshToken: currentRefreshToken },
    });

    const accessToken = data?.accessToken ?? "";
    const newRefreshToken = data?.refreshToken ?? "";
    const decoded = decodeJwt(accessToken);

    return {
      id: decoded?.sub ?? "",
      email: decoded?.email ?? decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ?? "",
      roles: [],
      accessToken,
      refreshToken: newRefreshToken,
    };
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
  await postApiAuthForgotPassword({ body: { email: payload.email } });
  return { success: true };
};

// =====================
// Reset password
// =====================

export const resetPassword = async (
  payload: ResetPasswordPayload,
): Promise<ApiSuccessResponse> => {
  await postApiAuthResetPassword({
    body: {
      email: payload.email,
      resetCode: payload.resetCode,
      newPassword: payload.newPassword,
    },
  });
  return { success: true };
};

// =====================
// Logout
// =====================

export const logout = async (): Promise<void> => {
  await postApiAuthLogout();
};
