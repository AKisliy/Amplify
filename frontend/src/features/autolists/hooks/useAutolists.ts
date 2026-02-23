import { useState, useEffect, useCallback } from "react";
import { autolistApi } from "../services/api";
import type { AutoList } from "../types";

export function useAutolists(projectId?: string) {
  const [autolists, setAutolists] = useState<AutoList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAutolists = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await autolistApi.getAutolists(projectId);
      setAutolists(data);
    } catch (err: unknown) {
      console.error("Failed to fetch autolists:", err);
      setError("Failed to fetch autolists");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const deleteAutolist = async (id: string) => {
    try {
      await autolistApi.deleteAutolist(id);
      setAutolists((prev) => prev.filter((al) => al.id !== id));
    } catch (err: unknown) {
      console.error("Failed to delete autolist:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAutolists();
  }, [fetchAutolists]);

  return {
    autolists,
    isLoading,
    error,
    deleteAutolist,
    refetch: fetchAutolists,
  };
}
