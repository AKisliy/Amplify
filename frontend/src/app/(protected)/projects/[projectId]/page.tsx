"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, ArrowRight, LayoutTemplate, Plus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProjectHeader } from "@/components/ProjectHeader";
import { useProject } from "@/features/ambassadors/hooks/useProjects";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { useAmbassador } from "@/features/ambassadors/hooks/useAmbassador";
import { useProjectTemplates } from "@/features/templates/hooks/useProjectTemplates";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTemplateV1TemplatesPost } from "@/lib/api/template-service";

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
  const { templates, isLoading: templatesLoading } = useProjectTemplates(projectId);

  const [ambassadorId, setAmbassadorId] = useState<string | undefined>(undefined);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
        {/* Ambassador banner (10-15% of viewport)                              */}
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
                >
                  <Card
                    className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group border-border/50 h-full"
                    onClick={() => handleOpenTemplate(template.id)}
                  >
                    {/* Thumbnail placeholder */}
                    <div className="w-full aspect-video bg-muted/60 rounded-t-lg flex items-center justify-center overflow-hidden">
                      {template.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={template.thumbnailUrl}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <LayoutTemplate className="w-10 h-10 text-muted-foreground/40 group-hover:text-primary/40 transition-colors" />
                      )}
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
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* New Template dialog */}
      <Dialog open={newTemplateOpen} onOpenChange={(open) => { setNewTemplateOpen(open); if (!open) setNewTemplateName(""); }}>
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
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateTemplate(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewTemplateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim() || isCreating}>
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
