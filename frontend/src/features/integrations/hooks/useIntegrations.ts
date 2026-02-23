import { useState, useEffect, useCallback } from "react";
import { integrationsApi } from "../services/api";
import { Integration } from "../types";

export function useIntegrations(projectId: string) {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchIntegrations = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await integrationsApi.getIntegrations(projectId);
            setIntegrations(data.integrations || []);
        } catch (err: any) {
            console.error("Failed to fetch integrations:", err);
            setError(err.message || "Failed to fetch integrations");
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchIntegrations();
    }, [fetchIntegrations]);

    const connectInstagram = async (code: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await integrationsApi.connectInstagram(projectId, code);
            await fetchIntegrations(); // Refresh list after connection
        } catch (err: any) {
            setError(err.message || "Failed to connect Instagram");
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const getAuthUrl = async () => {
        try {
            return await integrationsApi.getAuthUrl(projectId);
        } catch (err: any) {
            setError(err.message || "Failed to get auth url");
            throw err;
        }
    };

    return {
        integrations,
        isLoading,
        error,
        refetch: fetchIntegrations,
        connectInstagram,
        getAuthUrl
    };
}
