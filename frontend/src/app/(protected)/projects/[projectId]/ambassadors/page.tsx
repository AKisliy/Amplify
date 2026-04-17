"use client";

import { useParams } from "next/navigation";

import { useAmbassador } from "@/features/ambassadors/hooks/useAmbassador";
import { useProject, useProjects } from "@/features/ambassadors/hooks/useProjects";
import { AmbassadorView } from "@/features/ambassadors/components/AmbassadorView";
import type { AmbassadorFormValues } from "@/features/ambassadors/schemas/ambassador.schema";
import { ProjectHeader } from "@/components/ProjectHeader";
import { uploadMedia } from "@/features/ambassadors/services/ambassador.service";
import { ambassadorApi } from "@/features/ambassadors/services/api";

export default function ProjectAmbassadorPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const { project, isLoading: projectLoading } = useProject(projectId);
  const { projects, isLoading: projectsLoading } = useProjects();

  const {
    ambassador,
    isLoading: ambassadorLoading,
    createAmbassador,
    updateAmbassador,
    deleteAmbassador,
    refetch,
  } = useAmbassador(projectId);

  const handleCreateAmbassador = async (values: AmbassadorFormValues) => {
    try {
      await createAmbassador({ ...values, project_id: projectId });
    } catch (error) {
      console.error("Failed to create ambassador", error);
    }
  };

  const handleUpdateAmbassador = async (values: AmbassadorFormValues) => {
    if (!ambassador) return;
    await updateAmbassador({ id: ambassador.id, ...values });
  };

  const handleAvatarUpload = async (blob: Blob) => {
    if (!ambassador) return;
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    const mediaId = await uploadMedia(file);
    await ambassadorApi.linkAmbassadorImage(ambassador.id, mediaId, "portrait");
    refetch();
  };

  const handleDeleteAmbassador = async () => {
    if (!ambassador) return;
    try {
      await deleteAmbassador(ambassador.id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ProjectHeader projects={projects} isLoading={projectsLoading} />

      <main className="container mx-auto px-6 py-8">
        <AmbassadorView
          ambassador={ambassador}
          projectName={project?.name ?? "Project"}
          isLoading={ambassadorLoading || projectLoading}
          onCreateAmbassador={handleCreateAmbassador}
          onUpdateAmbassador={handleUpdateAmbassador}
          onDeleteAmbassador={handleDeleteAmbassador}
          onAvatarUpload={handleAvatarUpload}
          onImagesChange={refetch}
        />
      </main>
    </div>
  );
}
