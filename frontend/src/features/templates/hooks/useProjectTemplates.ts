import { useState, useEffect, useCallback } from "react";
import { getTemplatesByProjectV1TemplatesProjectProjectIdGet } from "@/lib/api/template-service";
import type { Template } from "@/features/ambassadors/types";
import type { ProjectTemplateResponse } from "@/lib/api/generated/template-service";

function getLocalCover(id: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(`template-cover-${id}`) ?? undefined;
}

function mapToTemplate(dto: ProjectTemplateResponse): Template {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    projectId: dto.project_id,
    // Use API thumbnail_url when available, fall back to localStorage
    thumbnailUrl: (dto as any).thumbnail_url ?? getLocalCover(dto.id),
    createdAt: dto.created_at,
  };
}

export function useProjectTemplates(projectId?: string) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getTemplatesByProjectV1TemplatesProjectProjectIdGet({
        path: { project_id: id },
        throwOnError: true,
      });
      setTemplates((data ?? []).map(mapToTemplate));
    } catch (err: any) {
      console.error("Failed to fetch templates:", err);
      setError(err.message || "Failed to fetch templates");
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchTemplates(projectId);
    } else {
      setTemplates([]);
    }
  }, [projectId, fetchTemplates]);

  return {
    templates,
    isLoading,
    error,
    refetch: projectId ? () => fetchTemplates(projectId) : undefined,
  };
}