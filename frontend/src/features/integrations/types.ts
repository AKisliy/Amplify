import { getSocialProviderName } from "@/features/autolists/types";

export interface Integration {
    id: string;
    socialProvider: number; // numeric enum from backend: Instagram=1, TikTok=2, Youtube=4
    username: string;
    avatarUrl?: string;
}

/** Return human-readable provider name for an Integration */
export function getIntegrationProviderName(integration: Integration): string {
    return getSocialProviderName(integration.socialProvider);
}

export interface IntegrationsResponse {
    connections: Integration[];
}

export interface AuthUrlResponse {
    authUrl: string;
}
