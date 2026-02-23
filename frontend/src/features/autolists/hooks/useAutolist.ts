import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { autolistApi } from "../services/api";
import type { AutoList, AutoListEntry, CreateAutoListDto, UpdateAutoListDto } from "../types";

export function useAutolist(autolistId?: string) {
  const params = useParams();
  const [autolist, setAutolist] = useState<AutoList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAutolist = useCallback(async () => {
    if (!autolistId) return;

    setIsLoading(true);
    setError(null);
    try {
      const projectId = (params?.projectId as string) || "proj-1";

      // Call getAutolist using new endpoint if not 'new'
      if (autolistId !== "new") {
        const data = await autolistApi.getAutolist(autolistId as string);
        setAutolist(data);
        return;
      }
      // If fetching all
      const autolists = await autolistApi.getAutolists(projectId);
      const found = autolists.find((al) => al.id === autolistId);
      setAutolist(found || null);
    } catch (err: unknown) {
      console.error("Failed to fetch autolist:", err);
      setError("Failed to fetch autolist");
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
      console.error("Failed to create autolist:", err);
      throw err;
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
      console.error("Failed to update autolist:", err);
      throw err;
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
      console.error("Failed to add entry:", err);
      throw err;
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
      console.error("Failed to update entry:", err);
      throw err;
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
      console.error("Failed to delete entry:", err);
      throw err;
    }
  };

  useEffect(() => {
    if (autolistId && autolistId !== "new") {
      fetchAutolist();
    } else if (autolistId === "new") {
      setAutolist({
        id: "new",
        name: "",
        entries: [],
        accounts: [],
        instagramSettings: { shareToFeed: false },
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
