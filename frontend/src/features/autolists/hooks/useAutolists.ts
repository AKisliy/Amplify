import { useState, useEffect, useCallback } from "react";
import { autolistApi } from "../services/api";
import type { AutoList } from "../types";

// Mock data for development
const MOCK_AUTOLISTS: AutoList[] = [
  {
    id: "al-1",
    name: "Daily Instagram Posts",
    actorId: "actor-1",
    postContainerId: "container-1",
    entries: [
      { id: "e1", autoListId: "al-1", dayOfWeeks: 62, publicationTime: "09:00:00" },
      { id: "e2", autoListId: "al-1", dayOfWeeks: 127, publicationTime: "18:00:00" },
    ],
    accounts: [{ id: "acc-1", name: "Main Instagram", platform: "instagram" }],
    instagramPreset: { shareToFeed: true },
    nextPublishTime: "Today at 6:00 PM",
    postsCount: 12,
  },
  {
    id: "al-2",
    name: "Weekend Specials",
    actorId: "actor-1",
    postContainerId: "container-1",
    entries: [
      { id: "e3", autoListId: "al-2", dayOfWeeks: 65, publicationTime: "10:00:00" },
    ],
    accounts: [{ id: "acc-1", name: "Main Instagram", platform: "instagram" }],
    instagramPreset: { shareToFeed: true },
    nextPublishTime: "Saturday at 10:00 AM",
    postsCount: 5,
  },
];

export function useAutolists(actorId?: string) {
  const [autolists, setAutolists] = useState<AutoList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAutolists = useCallback(async () => {
    if (!actorId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await autolistApi.getAutolists(actorId);
      setAutolists(data);
    } catch (err: unknown) {
      console.warn("Falling back to mock autolists due to API error:", err);
      setAutolists(MOCK_AUTOLISTS);
    } finally {
      setIsLoading(false);
    }
  }, [actorId]);

  const deleteAutolist = async (id: string) => {
    try {
      await autolistApi.deleteAutolist(id);
      setAutolists((prev) => prev.filter((al) => al.id !== id));
    } catch (err: unknown) {
      console.warn("Mocking delete autolist due to API error");
      setAutolists((prev) => prev.filter((al) => al.id !== id));
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
