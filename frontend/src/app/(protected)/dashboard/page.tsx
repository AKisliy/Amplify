"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import {
  FolderKanban,
  ArrowRight,
  Plus,
  Trash2,
  Home,
  Layers,
  ChevronRight,
} from "lucide-react";

import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { ProjectDialog } from "@/features/ambassadors/components/ProjectDialog";
import { ProjectFormValues } from "@/features/ambassadors/schemas/project.schema";

// ---------------------------------------------------------------------------
// Animation variants — defined once, reused throughout
// ---------------------------------------------------------------------------

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const headerVariant: Variants = {
  hidden: { opacity: 0, y: -16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProjectCard({
  project,
  index,
  onOpen,
  onDelete,
}: {
  project: { id: string; name: string; description?: string | null };
  index: number;
  onOpen: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <motion.div variants={fadeUp} className="group/card relative">
      <Card
        className="h-full cursor-pointer border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
        onClick={() => onOpen(project.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover/card:bg-primary/20 transition-colors duration-200">
              <FolderKanban className="w-5 h-5 text-primary" />
            </div>

            {/* Delete — appears on hover */}
            <button
              id={`delete-project-${project.id}`}
              aria-label={`Delete project ${project.name}`}
              onClick={(e) => onDelete(project.id, e)}
              className="
                p-1.5 rounded-md
                text-muted-foreground/50
                opacity-0 group-hover/card:opacity-100
                hover:text-destructive hover:bg-destructive/10
                transition-all duration-150
              "
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3">
            <CardTitle className="text-base leading-snug group-hover/card:text-primary transition-colors duration-150">
              {project.name}
            </CardTitle>
            {project.description && (
              <CardDescription className="text-xs mt-1 line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-4 px-6">
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60 group-hover/card:text-primary/70 transition-colors duration-150">
            <span>Open project</span>
            <ChevronRight className="w-3 h-3 group-hover/card:translate-x-0.5 transition-transform duration-150" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="animate-pulse border-border/50">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-lg bg-muted" />
            <div className="mt-3 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-3 bg-muted rounded w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Layers className="w-8 h-8 text-primary/60" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">No projects yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Create your first project to get started with ambassadors and
              workflow templates.
            </p>
          </div>
          <Button onClick={onCreateClick} className="mt-2">
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { projects, isLoading, createProject, deleteProject } = useProjects();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleNavigateToProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleCreateProject = async (values: ProjectFormValues) => {
    try {
      await createProject(values);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleDeleteProject = async (
    projectId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (
      confirm(
        "Are you sure you want to delete this project? This will also delete the associated ambassador."
      )
    ) {
      try {
        await deleteProject(projectId);
        localStorage.removeItem(`project_ambassador_${projectId}`);
      } catch (error) {
        console.error("Failed to delete project:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.header
        variants={headerVariant}
        initial="hidden"
        animate="show"
        className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Home className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">Amplify</span>
            </button>
            <UserMenu />
          </div>
        </div>
      </motion.header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="container mx-auto px-6 py-10">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="max-w-5xl mx-auto space-y-8"
        >
          {/* Page heading */}
          <motion.div
            variants={fadeUp}
            className="flex items-end justify-between gap-4"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
                Workspace
              </p>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage your projects and ambassador workflows.
              </p>
            </div>

            {projects.length > 0 && !isLoading && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            )}
          </motion.div>

          <motion.div variants={fadeUp}>
            <Separator />
          </motion.div>

          {/* Projects section */}
          <motion.section variants={fadeUp} className="space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Your Projects</h2>
                {!isLoading && projects.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground tabular-nums">
                    {projects.length}
                  </span>
                )}
              </div>
            </div>

            {/* Content states */}
            {isLoading ? (
              <SkeletonGrid />
            ) : projects.length === 0 ? (
              <EmptyState onCreateClick={() => setIsCreateDialogOpen(true)} />
            ) : (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {projects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    onOpen={handleNavigateToProject}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </motion.div>
            )}
          </motion.section>

          {/* Quick jump — shown only when there are multiple projects */}
          {!isLoading && projects.length > 1 && (
            <motion.section variants={fadeUp} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Jump
              </h2>
              <div className="flex flex-wrap gap-2">
                {projects.slice(0, 6).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleNavigateToProject(project.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border/60 bg-card hover:bg-muted hover:border-primary/30 transition-all duration-150 text-muted-foreground hover:text-foreground"
                  >
                    <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[140px]">
                      {project.name}
                    </span>
                    <ArrowRight className="w-3 h-3 shrink-0 opacity-50" />
                  </button>
                ))}
              </div>
            </motion.section>
          )}
        </motion.div>
      </main>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <ProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
