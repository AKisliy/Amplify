"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAutolists } from "@/features/autolists/hooks/useAutolists";
import { useProject, useProjects } from "@/features/ambassadors/hooks/useProjects";
import { ProjectHeader } from "@/components/ProjectHeader";
import { AutolistsTable } from "@/features/autolists/components/AutolistsTable";
import { AutolistEmptyState } from "@/features/autolists/components/AutolistEmptyState";
import { DeleteConfirmDialog } from "@/features/autolists/components/DeleteConfirmDialog";
import { GrainOverlay } from "@/components/ui/grain-overlay";

export default function AutolistsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const { project, isLoading: projectLoading } = useProject(projectId);
  const { projects, isLoading: projectsLoading } = useProjects();
  
  // Note: actorId would typically come from the project or user context
  // Using projectId as a placeholder for now
  const { autolists, isLoading: autolistsLoading, deleteAutolist } = useAutolists(projectId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAutolistId, setSelectedAutolistId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateClick = () => {
    router.push(`/projects/${projectId}/autolists/new`);
  };

  const handleDeleteClick = (id: string) => {
    setSelectedAutolistId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAutolistId) return;
    
    setIsDeleting(true);
    try {
      await deleteAutolist(selectedAutolistId);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedAutolistId(null);
    }
  };

  const isLoading = projectLoading || autolistsLoading;

  return (
    <div className="min-h-screen bg-background relative">
      <GrainOverlay />
      {/* Header */}
      <ProjectHeader projects={projects} isLoading={projectsLoading} />

      {/* Create Button Bar */}
      {autolists.length > 0 && (
        <div className="border-b border-border/30 bg-muted/20">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-end">
              <Button onClick={handleCreateClick} size="sm" className="gap-2 shadow-md">
                <Plus className="w-4 h-4" />
                Create Autolist
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : autolists.length === 0 ? (
          <AutolistEmptyState onCreateClick={handleCreateClick} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <AutolistsTable
              autolists={autolists}
              projectId={projectId}
              onDelete={handleDeleteClick}
            />
          </motion.div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
