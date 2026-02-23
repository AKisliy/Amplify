"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Home } from "lucide-react";

import { useAmbassador } from "@/features/ambassadors/hooks/useAmbassador";
import { useProject } from "@/features/ambassadors/hooks/useProjects";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { AmbassadorView } from "@/features/ambassadors/components/AmbassadorView";
import { ProjectSelector } from "@/features/ambassadors/components/ProjectSelector";
import type { AmbassadorFormValues } from "@/features/ambassadors/schemas/ambassador.schema";
import { ProjectHeader } from "@/components/ProjectHeader";

export default function ProjectAmbassadorPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const { project, isLoading: projectLoading } = useProject(projectId);
  const { projects, isLoading: projectsLoading } = useProjects();

  /*
   * WORKAROUND: We support both native backend linking (project.ambassadorId)
   * and a localStorage fallback if the backend hasn't been updated yet.
   */
  const [ambassadorId, setAmbassadorId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (project) {
      // Debug log to verify if backend returns ambassadorId
      console.log("Project loaded:", project);
      if (project.ambassadorId) {
        setAmbassadorId(project.ambassadorId);
        return;
      }
    }

    if (projectId) {
      const storedId = localStorage.getItem(`project_ambassador_${projectId}`);
      if (storedId) setAmbassadorId(storedId);
    }
  }, [projectId, project]);

  const {
    ambassador,
    isLoading: ambassadorLoading,
    createAmbassador,
    updateAmbassador,
    deleteAmbassador,
    refetch,
  } = useAmbassador(ambassadorId);

  const handleCreateAmbassador = async (values: AmbassadorFormValues) => {
    try {
      console.log("Creating ambassador with values:", { ...values, projectId });
      const newAmbassadorId = await createAmbassador({
        ...values,
        projectId,
      });

      if (newAmbassadorId) {
        setAmbassadorId(newAmbassadorId);
        localStorage.setItem(`project_ambassador_${projectId}`, newAmbassadorId);
        refetch();
      }
    } catch (error) {
      console.error("Failed to create ambassador", error);
    }
  };

  const handleUpdateAmbassador = async (values: AmbassadorFormValues) => {
    if (!ambassador) return;
    await updateAmbassador({
      id: ambassador.id,
      ...values,
    });
  };

  const handleDeleteAmbassador = async () => {
    if (!ambassador) return;
    try {
      await deleteAmbassador(ambassador.id);
      setAmbassadorId(undefined);
      localStorage.removeItem(`project_ambassador_${projectId}`);
    } catch (e) {
      console.error(e);
    }
  };

  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <ProjectHeader projects={projects} isLoading={projectsLoading} />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <AmbassadorView
          ambassador={ambassador}
          projectName={project?.name || "Project"}
          isLoading={ambassadorLoading || projectLoading}
          onCreateAmbassador={handleCreateAmbassador}
          onUpdateAmbassador={handleUpdateAmbassador}
          onDeleteAmbassador={handleDeleteAmbassador}
        />
      </main>
    </div>
  );
}

