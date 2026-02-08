"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect } from "react";

import { useAmbassador } from "@/features/ambassadors/hooks/useAmbassador";
import { useProject } from "@/features/ambassadors/hooks/useProjects";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { AmbassadorView } from "@/features/ambassadors/components/AmbassadorView";
import { ProjectSelector } from "@/features/ambassadors/components/ProjectSelector";
import type { AmbassadorFormValues } from "@/features/ambassadors/schemas/ambassador.schema";

export default function ProjectAmbassadorPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const { project, isLoading: projectLoading } = useProject(projectId);
  const { projects, isLoading: projectsLoading } = useProjects();
  
  // Get ambassador using the ambassadorId from the project
  // Note: If the backend doesn't include ambassadorId in ProjectDto,
  // this will remain null and show the "Create Ambassador" state
  const ambassadorId = project?.ambassadorId || undefined;
  
  const {
    ambassador,
    isLoading: ambassadorLoading,
    createAmbassador,
    updateAmbassador,
    deleteAmbassador,
    refetch,
  } = useAmbassador(ambassadorId);

  const handleCreateAmbassador = async (values: AmbassadorFormValues) => {
    await createAmbassador({
      ...values,
      projectId,
    });
    // Optionally refetch the project to get the updated ambassadorId
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
    await deleteAmbassador(ambassador.id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Ambassador</h1>
              <div className="h-6 w-px bg-border" />
              <ProjectSelector
                projects={projects}
                isLoading={projectsLoading}
              />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <AmbassadorView
          ambassador={ambassador}
          projectName={project?.name || "Project"}
          projectId={projectId}
          isLoading={ambassadorLoading || projectLoading}
          onCreateAmbassador={handleCreateAmbassador}
          onUpdateAmbassador={handleUpdateAmbassador}
          onDeleteAmbassador={handleDeleteAmbassador}
        />
      </main>
    </div>
  );
}

