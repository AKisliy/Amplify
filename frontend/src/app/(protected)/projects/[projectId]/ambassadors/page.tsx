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
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Home className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-lg">Amplify</span>
              </button>
              <div className="h-6 w-px bg-border" />
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
          isLoading={ambassadorLoading || projectLoading}
          onCreateAmbassador={handleCreateAmbassador}
          onUpdateAmbassador={handleUpdateAmbassador}
          onDeleteAmbassador={handleDeleteAmbassador}
        />
      </main>
    </div>
  );
}

