"use client";

import { useRouter, useParams } from "next/navigation";
import { Check, ChevronsUpDown, FolderKanban } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Project } from "../types";

interface ProjectSelectorProps {
  projects: Project[];
  isLoading?: boolean;
}

export function ProjectSelector({ projects, isLoading }: ProjectSelectorProps) {
  const router = useRouter();
  const params = useParams();
  const currentProjectId = params?.projectId as string | undefined;

  const handleProjectChange = (projectId: string) => {
    router.push(`/projects/${projectId}/ambassadors`);
  };

  if (isLoading) {
    return (
      <div className="w-[200px] h-10 bg-muted animate-pulse rounded-md" />
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No projects available</div>
    );
  }

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <Select value={currentProjectId} onValueChange={handleProjectChange}>
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-muted-foreground" />
          <SelectValue placeholder="Select a project">
            {currentProject?.name || "Select a project"}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <div className="flex items-center justify-between w-full">
              <span>{project.name}</span>
              {project.id === currentProjectId && (
                <Check className="w-4 h-4 ml-2" />
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
