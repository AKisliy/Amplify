import api from "@/lib/axios";
import { IntegrationsResponse, AuthUrlResponse } from "../types";

export const integrationsApi = {
    async getAuthUrl(projectId: string, provider: string): Promise<string> {
        const response = await api.get<AuthUrlResponse>(`connections/${projectId}/auth-url`, {
            params: { provider } 
        });
        return response.data.authUrl;
    },

    async connect(code: string, state: string): Promise<void> {
        const cleanState = state.replace(/#_$/, "");
        
        await api.post(`connections`, { 
            code, 
            state: cleanState 
        });
    },

    async getIntegrations(projectId: string): Promise<IntegrationsResponse> {
        const response = await api.get<IntegrationsResponse>(`connections/${projectId}`);
        return response.data;
    },

    async disconnectAccount(projectId: string, accountId: string): Promise<void> {
        await api.delete(`connections/${projectId}/accounts/${accountId}`);
    }
};
