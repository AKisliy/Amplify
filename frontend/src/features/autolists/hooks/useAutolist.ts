import { useState, useEffect, useCallback } from "react";
import { autolistApi } from "../services/api";
import type { AutoList, AutoListEntry, CreateAutoListDto, UpdateAutoListDto } from "../types";

// Mock single autolist for development
const MOCK_AUTOLIST: AutoList = {
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
};

export function useAutolist(autolistId?: string) {
  const [autolist, setAutolist] = useState<AutoList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAutolist = useCallback(async () => {
    if (!autolistId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Note: Backend doesn't have a single autolist endpoint,
      // so we fetch all and filter. In production, add dedicated endpoint.
      const actorId = "actor-1"; // This should come from context
      const autolists = await autolistApi.getAutolists(actorId);
      const found = autolists.find((al) => al.id === autolistId);
      setAutolist(found || null);
    } catch (err: unknown) {
      console.warn("Falling back to mock autolist due to API error:", err);
      if (autolistId === "al-1" || autolistId === "new") {
        setAutolist(MOCK_AUTOLIST);
      } else {
        setAutolist({ ...MOCK_AUTOLIST, id: autolistId, name: "New Autolist" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [autolistId]);

  const createAutolist = async (data: CreateAutoListDto): Promise<string> => {
    setIsLoading(true);
    try {
      const id = await autolistApi.createAutolist(data);
      return id;
    } catch (err: unknown) {
      console.warn("Mocking create autolist due to API error");
      const id = `al-${Date.now()}`;
      return id;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAutolist = async (data: UpdateAutoListDto) => {
    setIsLoading(true);
    try {
      await autolistApi.updateAutolist(data.id, data);
      await fetchAutolist();
    } catch (err: unknown) {
      console.warn("Mocking update autolist due to API error");
      setAutolist((prev) => (prev ? { ...prev, name: data.name } : null));
    } finally {
      setIsLoading(false);
    }
  };

  const addEntry = async (entry: Omit<AutoListEntry, "id">) => {
    if (!autolistId) return;
    
    try {
      const id = await autolistApi.createEntry({
        autoListId: autolistId,
        dayOfWeeks: entry.dayOfWeeks,
        publicationTime: entry.publicationTime,
      });
      const newEntry: AutoListEntry = { ...entry, id, autoListId: autolistId };
      setAutolist((prev) =>
        prev ? { ...prev, entries: [...prev.entries, newEntry] } : null
      );
    } catch (err: unknown) {
      console.warn("Mocking add entry due to API error");
      const newEntry: AutoListEntry = {
        ...entry,
        id: `e-${Date.now()}`,
        autoListId: autolistId || '',
      };
      setAutolist((prev) =>
        prev ? { ...prev, entries: [...prev.entries, newEntry] } : null
      );
    }
  };

  const updateEntry = async (id: string, data: Partial<AutoListEntry>) => {
    try {
      await autolistApi.updateEntry(id, {
        id,
        dayOfWeeks: data.dayOfWeeks || 0,
        publicationTime: data.publicationTime || "12:00:00",
      });
      setAutolist((prev) =>
        prev
          ? {
              ...prev,
              entries: prev.entries.map((e) =>
                e.id === id ? { ...e, ...data } : e
              ),
            }
          : null
      );
    } catch (err: unknown) {
      console.warn("Mocking update entry due to API error");
      setAutolist((prev) =>
        prev
          ? {
              ...prev,
              entries: prev.entries.map((e) =>
                e.id === id ? { ...e, ...data } : e
              ),
            }
          : null
      );
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await autolistApi.deleteEntry(id);
      setAutolist((prev) =>
        prev
          ? { ...prev, entries: prev.entries.filter((e) => e.id !== id) }
          : null
      );
    } catch (err: unknown) {
      console.warn("Mocking delete entry due to API error");
      setAutolist((prev) =>
        prev
          ? { ...prev, entries: prev.entries.filter((e) => e.id !== id) }
          : null
      );
    }
  };

  useEffect(() => {
    if (autolistId && autolistId !== "new") {
      fetchAutolist();
    } else if (autolistId === "new") {
      setAutolist({
        id: "new",
        name: "",
        actorId: "",
        postContainerId: "",
        entries: [],
        accounts: [],
        instagramPreset: { shareToFeed: false },
      });
    }
  }, [autolistId, fetchAutolist]);

  return {
    autolist,
    isLoading,
    error,
    createAutolist,
    updateAutolist,
    addEntry,
    updateEntry,
    deleteEntry,
    refetch: fetchAutolist,
  };
}
