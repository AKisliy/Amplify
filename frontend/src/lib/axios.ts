import axios from "axios";

// Create axios instance
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// Basic mapping of root-level paths to their respective microservices
const serviceMap: Record<string, string> = {
    auth: "/userservice/api",
    users: "/userservice/api",
    projects: "/userservice/api",
    ambassadors: "/userservice/api",
    autolist: "/publisher",
    autolistentry: "/publisher",
    integrations: "/publisher/api",
    images: "/media-ingest/api",
    media: "/media-ingest/api",
};

// Request interceptor for API calls
api.interceptors.request.use(
    (config) => {
        // Determine the microservice based on the first segment of the URL
        if (config.url) {
            const cleanPath = config.url.startsWith("/") ? config.url.substring(1) : config.url;
            const firstSegment = cleanPath.split("/")[0];
            const servicePrefix = serviceMap[firstSegment] || "/userservice/api"; // Default to userservice

            // Extract the base host from the environment variable (strip any existing path)
            const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://amplify.34.40.73.43.nip.io";
            try {
                const urlObj = new URL(envUrl);
                const baseHost = `${urlObj.protocol}//${urlObj.host}`;
                config.baseURL = baseHost + servicePrefix;
            } catch (e) {
                // Fallback if URL parsing fails
                config.baseURL = envUrl;
            }
        }

        // Add token if available
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("accessToken");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Top level variables for token refresh state
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

// Response interceptor for API calls
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, wait in the queue and retry when complete
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
            const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

            if (refreshToken && accessToken) {
                try {
                    console.log("Axios Interceptor: 401 detected, attempting refresh...");
                    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://amplify.34.40.73.43.nip.io";
                    const refreshUrl = `${envUrl}/userservice/api/auth/refresh`;

                    // Call refresh endpoint directly
                    const { data } = await axios.post(refreshUrl, {
                        accessToken,
                        refreshToken
                    });

                    console.log("Axios Interceptor: Refresh successful");

                    // Update stored tokens
                    if (typeof window !== "undefined") {
                        localStorage.setItem("accessToken", data.accessToken);
                        localStorage.setItem("refreshToken", data.refreshToken);
                    }

                    // Update authorization header for the RETRY
                    originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

                    // Update the instance's custom headers too for future requests
                    api.defaults.headers.common["Authorization"] = `Bearer ${data.accessToken}`;

                    // Resolve the queue and retry original request
                    processQueue(null, data.accessToken);
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
                // No token available to refresh, log out immediately
                processQueue(new Error("No refresh token available"), null);
                isRefreshing = false;
                handleLogout();
                return Promise.reject(error);
            }
        }

        // If it's a CORS error (network error) often hiding a 401 or 500
        // we can't do much but reject.
        return Promise.reject(error);
    }
);

export default api;
