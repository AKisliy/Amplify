import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech";

// ---------------------------------------------------------------------------
// Type — mirrors the /v1/library-templates/ response
// ---------------------------------------------------------------------------

export interface LibraryTemplate {
  id: string;
  name: string;
  description: string | null;
  graph_json: Record<string, unknown>;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLibraryTemplates(limit = 50) {
  const [templates, setTemplates] = useState<LibraryTemplate[]>([]);
  const [isLoading, setIsLoading]  = useState(false);
  const [error, setError]          = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<LibraryTemplate[]>(
        `${apiBase}/template/v1/library-templates/`,
        { params: { limit, skip: 0 } }
      );
      setTemplates(data ?? []);
    } catch (err: any) {
      console.error("Failed to fetch library templates:", err);
      setError(err?.response?.data?.detail ?? err.message ?? "Failed to fetch library templates");
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, isLoading, error, refetch: fetchTemplates };
}

// ---------------------------------------------------------------------------
// Single-template fetch helper (for duplicate flow)
// ---------------------------------------------------------------------------

export async function getLibraryTemplate(templateId: string): Promise<LibraryTemplate> {
  const { data } = await api.get<LibraryTemplate>(
    `${apiBase}/template/v1/library-templates/${templateId}`
  );
  return data;
}
