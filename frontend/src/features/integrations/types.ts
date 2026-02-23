export interface Integration {
    id: string;
    socialProvider: number; // e.g. 1 for Instagram
    username: string;
}

export interface IntegrationsResponse {
    integrations: Integration[];
}

export interface AuthUrlResponse {
    authUrl: string;
}
