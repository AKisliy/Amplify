import { useState, useEffect, useCallback } from "react";
import { listTemplatesV1TemplatesGet } from "@/lib/api/template-service";
import type { ProjectTemplateResponse } from "@/lib/api/generated/template-service";

export function useGlobalTemplates(limit = 20) {
  const [templates, setTemplates] = useState<ProjectTemplateResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listTemplatesV1TemplatesGet({
        query: { limit, skip: 0 },
        throwOnError: true,
      });
      setTemplates(data ?? []);
    } catch (err: any) {
      console.error("Failed to fetch global templates:", err);
      setError(err.message || "Failed to fetch templates");
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { templates, isLoading, error, refetch: fetch };
}
