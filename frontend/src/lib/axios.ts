import axios from "axios";

// Create axios instance — a single shared instance used by all hey-api clients
// and any remaining manual calls that are not yet in a generated spec.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor ──────────────────────────────────────────────────────
// Injects the Bearer token from localStorage into every outbound request.
// All service-specific base URLs are now set by each generated client wrapper
// (see src/lib/api/*.ts) — no URL routing logic needed here.
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Token refresh state ──────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const handleLogout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("auth_user");
    window.location.href = "/login";
  }
};

// ── Response interceptor ─────────────────────────────────────────────────────
// Handles 401 responses by attempting a token refresh then retrying the failed
// request. Concurrent requests are queued during the refresh and retried once
// a new token is available.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            } else {
              originalRequest.headers = { Authorization: `Bearer ${token}` };
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
      const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      if (refreshToken && accessToken) {
        try {
          console.log("Axios Interceptor: 401 detected, attempting refresh...");
          const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://staging.alexeykiselev.tech";
          const refreshUrl = `${envUrl}/userservice/api/auth/refresh`;

          const { data } = await axios.post(refreshUrl, { accessToken, refreshToken });

          console.log("Axios Interceptor: Refresh successful");

          const newAccessToken = data.accessToken || data.AccessToken;
          const newRefreshToken = data.refreshToken || data.RefreshToken;

          if (!newAccessToken) {
            throw new Error("Refresh token response missing access token");
          }

          if (typeof window !== "undefined") {
            localStorage.setItem("accessToken", newAccessToken);
            localStorage.setItem("refreshToken", newRefreshToken);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          } else {
            originalRequest.headers = { Authorization: `Bearer ${newAccessToken}` };
          }

          api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Axios Interceptor: Refresh failed", refreshError);
          processQueue(refreshError, null);
          handleLogout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        processQueue(new Error("No refresh token available"), null);
        isRefreshing = false;
        handleLogout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
