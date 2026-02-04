import { useState, useCallback, useEffect } from "react";
import * as ambassadorApi from "../services/ambassador.service";
import { Ambassador, CreateAmbassadorPayload, UpdateAmbassadorPayload } from "../types";

export function useAmbassador(ambassadorId?: string | null) {
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAmbassador = useCallback(async () => {
    if (!ambassadorId) {
        setAmbassador(null);
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await ambassadorApi.getAmbassador(ambassadorId);
      setAmbassador(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch ambassador");
    } finally {
      setIsLoading(false);
    }
  }, [ambassadorId]);

  useEffect(() => {
    fetchAmbassador();
  }, [fetchAmbassador]);

  const createAmbassador = async (payload: CreateAmbassadorPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const id = await ambassadorApi.createAmbassador(payload);
      return id;
    } catch (err: any) {
      const msg = err?.response?.data?.title || err.message || "Failed to create ambassador";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAmbassador = async (payload: UpdateAmbassadorPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      await ambassadorApi.updateAmbassador(payload);
      setAmbassador((prev) => prev ? { ...prev, ...payload } : null);
    } catch (err: any) {
      const msg = err?.response?.data?.title || err.message || "Failed to update ambassador";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAmbassador = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await ambassadorApi.deleteAmbassador(id);
      setAmbassador(null);
    } catch (err: any) {
      const msg = err?.response?.data?.title || err.message || "Failed to delete ambassador";
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
    refetch: fetchAmbassador
  };
}
