import { useState, useEffect } from "react";
import { projectApi } from "../services/api";
import type { Project } from "../types";

const MOCK_PROJECTS: Project[] = [
  {
    id: "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    name: "Project Alpha",
    description: "Developing the new mobile app interface.",
    photo: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    ambassadorId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
  },
  {
    id: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6e",
    name: "Project Beta",
    description: "Launching the Q3 marketing campaign.",
    photo: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800",
    ambassadorId: "2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d"
  },
  {
    id: "2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7f",
    name: "Project Gamma",
    description: "Conducting market research.",
    photo: "https://images.unsplash.com/photo-1454165833767-02306d74659f?auto=format&fit=crop&q=80&w=800",
    ambassadorId: "3a4b5c6d-7e8f-8a9b-0c1d-2e3f4a5b6c8d"
  }
];

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectApi.getProjects();
      setProjects(data.length > 0 ? data : MOCK_PROJECTS);
    } catch (err: any) {
      console.warn("Falling back to mock projects due to API error:", err);
      setProjects(MOCK_PROJECTS);
    } finally {
      setIsLoading(false);
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
  };
}

export function useProject(projectId?: string) {
  const [project, setProject] = useState<Project | null>(
    MOCK_PROJECTS.find(p => p.id === projectId) || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectApi.getProject(id);
      setProject(data);
    } catch (err: any) {
      console.warn("Falling back to mock project due to API error:", err);
      const mock = MOCK_PROJECTS.find(p => p.id === id);
      setProject(mock || null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId]);

  return {
    project,
    isLoading,
    error,
    refetch: projectId ? () => fetchProject(projectId) : undefined,
  };
}

