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

// Response interceptor for API calls
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                console.log("Axios Interceptor: 401 detected, attempting refresh...");
                // Attempt to refresh token
                const refreshToken = localStorage.getItem("refreshToken");
                const accessToken = localStorage.getItem("accessToken");

                if (refreshToken && accessToken) {
                    // Call refresh endpoint directly
                    // Construct URL explicitly to ensure it points to the correct service
                    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://amplify.34.40.73.43.nip.io";
                    const refreshUrl = `${envUrl}/userservice/api/auth/refresh`;

                    console.log("Axios Interceptor: Calling refresh endpoint:", refreshUrl);

                    // We must include the expired access token if the backend requires (commonly in 'RefreshTokenCommand')
                    // Assuming the backend endpoint confirms to: POST /auth/refresh { accessToken, refreshToken }
                    const { data } = await axios.post(refreshUrl, {
                        accessToken,
                        refreshToken
                    });

                    console.log("Axios Interceptor: Refresh successful", data);

                    // Update stored tokens
                    localStorage.setItem("accessToken", data.accessToken);
                    localStorage.setItem("refreshToken", data.refreshToken);

                    // Update authorization header for the RETRY
                    originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

                    // Important: Update the instance's custom headers too for future requests
                    api.defaults.headers.common["Authorization"] = `Bearer ${data.accessToken}`;

                    // Retry original request
                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.error("Axios Interceptor: Refresh failed", refreshError);
                // Refresh failed - clear tokens and redirect to login
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("auth_user");

                if (typeof window !== "undefined") {
                    window.location.href = "/login";
                }
            }
        }

        // If it's a CORS error (network error) often hiding a 401 or 500
        // we can't do much but reject.
        return Promise.reject(error);
    }
);

export default api;
