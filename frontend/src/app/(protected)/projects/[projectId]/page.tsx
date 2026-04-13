"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, ArrowRight, LayoutTemplate, Plus, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProjectHeader } from "@/components/ProjectHeader";
import { useProject } from "@/features/ambassadors/hooks/useProjects";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { useAmbassador } from "@/features/ambassadors/hooks/useAmbassador";
import { useProjectTemplates } from "@/features/templates/hooks/useProjectTemplates";
import { WorkflowLibrary } from "@/features/templates/components/WorkflowLibrary";
import { TemplateCoverUpload } from "@/features/templates/components/TemplateCoverUpload";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTemplateV1TemplatesPost,
  deleteTemplateV1TemplatesTemplateIdDelete,
} from "@/lib/api/template-service";
import type { ProjectTemplateResponse } from "@/lib/api/generated/template-service";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const { project, isLoading: projectLoading } = useProject(projectId);
  const { projects, isLoading: projectsLoading } = useProjects();
  const { templates, isLoading: templatesLoading, refetch } = useProjectTemplates(projectId);

  const [ambassadorId, setAmbassadorId] = useState<string | undefined>(undefined);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Delete state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateTemplate = async () => {
    const name = newTemplateName.trim();
    if (!name || !projectId) return;
    setIsCreating(true);
    try {
      const { data } = await createTemplateV1TemplatesPost({
        body: { project_id: projectId, name },
        throwOnError: true,
      });
      setNewTemplateOpen(false);
      setNewTemplateName("");
      router.push(`/projects/${projectId}/templates/${data!.id}`);
    } catch (err) {
      console.error("Failed to create template:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteTemplateV1TemplatesTemplateIdDelete({
        path: { template_id: deleteTargetId },
        throwOnError: true,
      });
      setDeleteTargetId(null);
      refetch?.();
    } catch (err) {
      console.error("Failed to delete template:", err);
    } finally {
      setIsDeleting(false);
    }
  };

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

  const handleViewAmbassador = () => {
    router.push(`/projects/${projectId}/ambassadors`);
  };

  const handleOpenTemplate = (templateId: string) => {
    router.push(`/projects/${projectId}/templates/${templateId}`);
  };

  const { ambassador } = useAmbassador(ambassadorId);

  return (
    <div className="min-h-screen bg-background">
      <ProjectHeader projects={projects} isLoading={projectsLoading} />

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* ------------------------------------------------------------------ */}
        {/* Ambassador banner                                                   */}
        {/* ------------------------------------------------------------------ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 py-2"
        >
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-border shadow-sm shrink-0">
              <AvatarImage src={ambassador?.profileImageUrl ?? undefined} className="object-cover" />
              <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                {getInitials(ambassador?.name || "Ambassador Name")}
              </AvatarFallback>
            </Avatar>

            <div>
              <h2 className="text-xl font-semibold leading-tight">{ambassador?.name || "Ambassador Name"}</h2>
              <p className="text-sm text-muted-foreground mt-0.5 max-w-lg line-clamp-2">
                {ambassador?.biography || "Ambassador Biography"}
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" className="shrink-0 group" onClick={handleViewAmbassador}>
            <User className="w-4 h-4 mr-2" />
            View Ambassador
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </motion.div>

        <Separator />

        {/* ------------------------------------------------------------------ */}
        {/* Workflow Library                                                    */}
        {/* ------------------------------------------------------------------ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <WorkflowLibrary
            projectId={projectId}
          />
        </motion.div>

        {/* ------------------------------------------------------------------ */}
        {/* Templates section                                                   */}
        {/* ------------------------------------------------------------------ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                {projectLoading ? "…" : project?.name ?? "Project"} Templates
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Select a template to open the canvas editor
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setNewTemplateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>

          {templatesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-border/50 h-full animate-pulse">
                  <div className="w-full aspect-video bg-muted/60 rounded-t-lg" />
                  <CardHeader className="pt-3 pb-2 px-4">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <LayoutTemplate className="w-14 h-14 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">No Templates Yet</h3>
                <p className="text-muted-foreground text-center text-sm">
                  Templates for this project will appear here once created.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.07 }}
                  className="relative group/card"
                >
                  <Card
                    className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group border-border/50 h-full"
                    onClick={() => handleOpenTemplate(template.id)}
                  >
                    {/* Thumbnail / Cover Upload */}
                    <div
                      className="relative w-full aspect-video bg-muted/60 rounded-t-lg overflow-hidden group/cover"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Cover image or placeholder icon */}
                      {template.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={template.thumbnailUrl}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <LayoutTemplate className="w-10 h-10 text-muted-foreground/40 group-hover:text-primary/40 transition-colors" />
                        </div>
                      )}

                      {/* Camera overlay — appears on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover/cover:opacity-100">
                        <TemplateCoverUpload
                          templateId={template.id}
                          initialCoverUrl={template.thumbnailUrl}
                          variant="overlay"
                        />
                      </div>
                    </div>

                    <CardHeader className="pt-3 pb-2 px-4">
                      <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors">
                        {template.name}
                      </CardTitle>
                      {template.description && (
                        <CardDescription className="text-xs line-clamp-2 mt-1">
                          {template.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground/70">
                        {template.createdAt
                          ? new Date(template.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : null}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Delete button — visible on card hover */}
                  <button
                    id={`delete-template-${template.id}`}
                    aria-label={`Delete template ${template.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTargetId(template.id);
                      setDeleteTargetName(template.name);
                    }}
                    className="
                      absolute top-2 right-2 z-10
                      p-1.5 rounded-md
                      bg-background/80 backdrop-blur-sm
                      border border-border/50
                      text-muted-foreground
                      opacity-0 group-hover/card:opacity-100
                      hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10
                      transition-all duration-150
                    "
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* ── New Template dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={newTemplateOpen}
        onOpenChange={(open) => {
          setNewTemplateOpen(open);
          if (!open) setNewTemplateName("");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              placeholder="e.g. YouTube Short"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTemplate();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewTemplateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={!newTemplateName.trim() || isCreating}
            >
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Template confirmation ────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>&ldquo;{deleteTargetName}&rdquo;</strong> will be permanently deleted along
              with all its canvas data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
