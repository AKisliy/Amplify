// socialProvider is serialized as a string by the backend
export interface Integration {
    id: string;
    socialProvider: "Instagram" | "TikTok" | "Youtube" | string;
    username: string;
    avatarUrl?: string;
}

export interface IntegrationsResponse {
    connections: Integration[];
}

export interface AuthUrlResponse {
    authUrl: string;
}
