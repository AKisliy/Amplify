"use client";

import { useState, useEffect, useCallback } from "react";
import { projectApi } from "../services/api";
import type { ProjectAsset } from "../types";

export function useProjectAssets(projectId: string | undefined) {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchAssets = useCallback(async (cursor?: string) => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await projectApi.getProjectAssets(projectId, { cursor });
      setAssets((prev) => cursor ? [...prev, ...result.items] : result.items);
      setNextCursor(result.nextCursor);
    } catch (err) {
      setError("Failed to load assets");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setAssets([]);
    setNextCursor(null);
    fetchAssets();
  }, [fetchAssets]);

  const loadMore = useCallback(() => {
    if (nextCursor) fetchAssets(nextCursor);
  }, [nextCursor, fetchAssets]);

  return { assets, isLoading, error, nextCursor, loadMore };
}
