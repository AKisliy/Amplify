import { useState, useCallback, useEffect } from "react";
import { ambassadorApi } from "../services/api";
import type { Ambassador, CreateAmbassadorPayload, UpdateAmbassadorPayload } from "../types";

export function useAmbassador(projectId?: string | null) {
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAmbassador = useCallback(async () => {
    if (!projectId) {
      setAmbassador(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await ambassadorApi.getAmbassadorByProject(projectId);
      setAmbassador(data);
    } catch (err: any) {
      // 404 means no ambassador yet — not an error state
      if (err?.response?.status === 404) {
        setAmbassador(null);
      } else {
        console.error(err);
        setError(err.message || "Failed to fetch ambassador");
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAmbassador();
  }, [fetchAmbassador]);

  const createAmbassador = async (payload: CreateAmbassadorPayload): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const created = await ambassadorApi.createAmbassador(payload);
      setAmbassador(created);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || "Failed to create ambassador";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAmbassador = async (payload: UpdateAmbassadorPayload): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await ambassadorApi.updateAmbassador(payload);
      setAmbassador(updated);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || "Failed to update ambassador";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAmbassador = async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await ambassadorApi.deleteAmbassador(id);
      setAmbassador(null);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || "Failed to delete ambassador";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ambassador,
    isLoading,
    error,
    createAmbassador,
    updateAmbassador,
    deleteAmbassador,
    refetch: fetchAmbassador,
  };
}
