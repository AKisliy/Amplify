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
            setIntegrations(data.connections || []);
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

    const connectIntegration = async (code: string, state: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await integrationsApi.connect(code, state);
            await fetchIntegrations(); // Refresh list after connection
        } catch (err: any) {
            setError(err.message || "Failed to connect integration");
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const getAuthUrl = async (provider: string) => {
        try {
            return await integrationsApi.getAuthUrl(projectId, provider);
        } catch (err: any) {
            setError(err.message || "Failed to get auth url");
            throw err;
        }
    };

    const disconnectAccount = async (accountId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await integrationsApi.disconnectAccount(projectId, accountId);
            await fetchIntegrations(); // Refresh list after deletion
        } catch (err: any) {
            setError(err.message || "Failed to disconnect account");
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        integrations,
        isLoading,
        error,
        refetch: fetchIntegrations,
        connectIntegration,
        getAuthUrl,
        disconnectAccount
    };
}
