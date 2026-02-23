import api from "@/lib/axios";
import { IntegrationsResponse, AuthUrlResponse } from "../types";

export const integrationsApi = {
    async getAuthUrl(projectId: string): Promise<string> {
        const response = await api.get<AuthUrlResponse>(`/integrations/${projectId}/instagram/auth-url`);
        return response.data.authUrl;
    },

    async connectInstagram(projectId: string, code: string): Promise<void> {
        await api.post(`/integrations/${projectId}/instagram/connect?code=${encodeURIComponent(code)}`);
    },

    async getIntegrations(projectId: string): Promise<IntegrationsResponse> {
        const response = await api.get<IntegrationsResponse>(`/integrations/${projectId}`);
        return response.data;
    }
};
