"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FolderKanban, User, ArrowRight, Plus, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { ProjectDialog } from "@/features/ambassadors/components/ProjectDialog";
import { ProjectFormValues } from "@/features/ambassadors/schemas/project.schema";

export default function DashboardPage() {
  const router = useRouter();
  const { projects, isLoading, createProject, deleteProject } = useProjects();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleNavigateToAmbassador = (projectId: string) => {
    router.push(`/projects/${projectId}/ambassadors`);
  };

  const handleCreateProject = async (values: ProjectFormValues) => {
    try {
      await createProject(values);
      // Determine if we need to navigate or just stay here. 
      // For now, let's just stay here and the list will update.
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project? This will also delete the associated ambassador.")) {
      try {
        await deleteProject(projectId);
        // Also clear any local storage for this project's ambassador
        localStorage.removeItem(`project_ambassador_${projectId}`);
      } catch (error) {
        console.error("Failed to delete project:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Global Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-lg">Amplify</span>
            </button>
            {/* We can add user menu here later if needed */}
          </div>
        </div>
      </motion.header>

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto space-y-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Welcome back! Manage your projects and ambassadors.
              </p>
            </div>
            {projects.length > 0 && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            )}
          </div>

          {/* Projects Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Projects</h2>
              {projects.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {projects.length} {projects.length === 1 ? "project" : "projects"}
                </p>
              )}
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-10 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FolderKanban className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    Create your first project to get started with ambassadors.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>Create Project</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow border-border/50">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FolderKanban className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{project.name}</CardTitle>
                              {project.description && (
                                <CardDescription className="mt-1 line-clamp-2">
                                  {project.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
                            onClick={(e) => handleDeleteProject(project.id, e)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="outline"
                          className="w-full group"
                          onClick={() => handleNavigateToAmbassador(project.id)}
                        >
                          <User className="w-4 h-4 mr-2" />
                          View Ambassador
                          <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {projects.length > 0 && (
            <Card className="bg-muted/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>
                  Navigate to your project ambassadors
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {projects.slice(0, 5).map((project) => (
                  <Button
                    key={project.id}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleNavigateToAmbassador(project.id)}
                  >
                    {project.name}
                    <ArrowRight className="w-3 h-3 ml-2" />
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>

        <ProjectDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={handleCreateProject}
        />
      </div>
    </div>
  );
}
