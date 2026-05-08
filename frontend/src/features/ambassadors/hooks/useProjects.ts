import { useState, useEffect, useCallback } from "react";
import { projectApi } from "../services/api";
import type { Project } from "../types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectApi.getProjects();
      // Sort: most recently renamed first (localUpdatedAt), then preserve server order
      const sorted = [...data].sort((a, b) => {
        if (a.localUpdatedAt && b.localUpdatedAt) return b.localUpdatedAt.localeCompare(a.localUpdatedAt);
        if (a.localUpdatedAt) return -1;
        if (b.localUpdatedAt) return 1;
        return 0;
      });
      setProjects(sorted);
    } catch (err: any) {
      console.error("Failed to fetch projects:", err);
      setError(err.message || "Failed to fetch projects");
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await projectApi.createProject(data);
      await fetchProjects(); // Refresh list
    } catch (err: any) {
      setError(err.message || "Failed to create project");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await projectApi.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (typeof window !== "undefined") {
        localStorage.removeItem(`project-updated-${id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete project");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const renameProject = async (id: string, name: string) => {
    try {
      await projectApi.renameProject(id, name);
      await fetchProjects();
    } catch (err: any) {
      setError(err.message || "Failed to rename project");
      throw err;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    createProject,
    deleteProject,
    renameProject,
  };
}

export function useProject(projectId?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectApi.getProject(id);
      setProject(data);
    } catch (err: any) {
      console.error("Failed to fetch project:", err);
      setError(err.message || "Failed to fetch project");
      setProject(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    } else {
      setProject(null);
    }
  }, [projectId, fetchProject]);

  return {
    project,
    isLoading,
    error,
    refetch: projectId ? () => fetchProject(projectId) : undefined,
  };
}

