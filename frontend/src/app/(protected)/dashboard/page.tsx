"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Plus,
  Trash2,
  Home,
  Layers,
  ChevronRight,
  Pencil,
  LayoutTemplate,
  Link as LinkIcon,
  Calendar,
  Sparkles,
  Clock,
  Search,
} from "lucide-react";

import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { useDashboardStats } from "@/features/ambassadors/hooks/useDashboardStats";
import { ProjectDialog } from "@/features/ambassadors/components/ProjectDialog";
import { ProjectFormValues } from "@/features/ambassadors/schemas/project.schema";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const stagger: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
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

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="relative overflow-hidden border-border/50 hover:border-border transition-colors duration-200">
        <CardContent className="flex items-center gap-4 py-5 px-5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tabular-nums leading-none">
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {label}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Project Card — premium version
// ---------------------------------------------------------------------------

const PROJECT_ACCENTS = [
  "from-violet-500/15 to-indigo-500/10 text-violet-600 dark:text-violet-400",
  "from-sky-500/15 to-cyan-500/10 text-sky-600 dark:text-sky-400",
  "from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400",
  "from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400",
  "from-rose-500/15 to-pink-500/10 text-rose-600 dark:text-rose-400",
  "from-fuchsia-500/15 to-purple-500/10 text-fuchsia-600 dark:text-fuchsia-400",
];

function ProjectCard({
  project,
  index,
  onOpen,
  onDelete,
  onRename,
}: {
  project: { id: string; name: string; description?: string | null };
  index: number;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string, e: React.MouseEvent) => void;
}) {
  const accent = PROJECT_ACCENTS[index % PROJECT_ACCENTS.length];
  const gradientParts = accent.split(" ");
  const textColor = gradientParts.slice(2).join(" ");

  return (
    <motion.div variants={fadeUp} className="group/card relative">
      <Card
        className="h-full cursor-pointer border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/20 transition-all duration-300"
        onClick={() => onOpen(project.id)}
      >
        {/* Gradient accent bar */}
        <div
          className={`h-1 w-full bg-gradient-to-r ${gradientParts[0]} ${gradientParts[1]}`}
        />

        <CardHeader className="pb-3 pt-5">
          <div className="flex items-start justify-between gap-2">
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent.split(" ").slice(0, 2).join(" ")} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/card:scale-105`}
            >
              <FolderKanban className={`w-5 h-5 ${textColor}`} />
            </div>

            {/* Actions — hover reveal */}
            <div className="flex gap-0.5 opacity-0 group-hover/card:opacity-100 transition-all duration-200 translate-y-0.5 group-hover/card:translate-y-0">
              <button
                id={`rename-project-${project.id}`}
                aria-label={`Rename project ${project.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(project.id, project.name, e);
                }}
                className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-all duration-150 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                id={`delete-project-${project.id}`}
                aria-label={`Delete project ${project.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id);
                }}
                className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all duration-150 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3">
            <CardTitle className="text-base font-semibold leading-snug group-hover/card:text-foreground transition-colors duration-200">
              {project.name}
            </CardTitle>
            {project.description && (
              <CardDescription className="text-xs mt-1.5 line-clamp-2 leading-relaxed">
                {project.description}
              </CardDescription>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-4 px-6">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 group-hover/card:text-muted-foreground transition-colors duration-200">
            <span className="font-medium">Open project</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover/card:translate-x-0.5 transition-transform duration-200" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Grid — shimmer effect
// ---------------------------------------------------------------------------

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card
          key={i}
          className="border-border/40 overflow-hidden"
        >
          {/* Accent bar skeleton */}
          <div className="h-1 w-full bg-muted/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-[shimmer_2s_infinite]" />
          </div>
          <CardHeader className="pb-3 pt-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted/60 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-[shimmer_2s_infinite]" />
              </div>
              <div className="flex-1 space-y-2.5 pt-0.5">
                <div className="h-4 bg-muted/60 rounded-md w-3/4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-[shimmer_2s_infinite]" />
                </div>
                <div className="h-3 bg-muted/40 rounded-md w-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-[shimmer_2s_infinite]" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-3 bg-muted/40 rounded-md w-1/3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State — premium
// ---------------------------------------------------------------------------

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div variants={scaleIn}>
      <Card className="border-dashed border-2 border-border/60 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
              <Layers className="w-9 h-9 text-primary/60" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary/70" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Start your first project</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
              Create a project to manage ambassadors, build workflow templates,
              and publish content.
            </p>
          </div>
          <Button onClick={onCreateClick} size="lg" className="mt-1 cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stat Skeletons
// ---------------------------------------------------------------------------

function StatSkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="border-border/40 overflow-hidden">
          <CardContent className="flex items-center gap-4 py-5 px-5">
            <div className="w-11 h-11 rounded-xl bg-muted/60 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
            <div className="space-y-2">
              <div className="h-5 bg-muted/60 rounded-md w-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-[shimmer_2s_infinite]" />
              </div>
              <div className="h-3 bg-muted/40 rounded-md w-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-[shimmer_2s_infinite]" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { projects, isLoading, createProject, deleteProject, renameProject } =
    useProjects();
  const { stats, isLoading: statsLoading } = useDashboardStats(projects);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Search / filter
  const [searchQuery, setSearchQuery] = useState("");

  // Rename state
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete confirmation state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");

  const displayName = user?.email?.split("@")[0] || "User";
  const initials = getInitials(displayName);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  // Handlers
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

  const handleRequestDelete = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setDeleteTargetId(projectId);
    setDeleteTargetName(project?.name || "this project");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteProject(deleteTargetId);
      localStorage.removeItem(`project_ambassador_${deleteTargetId}`);
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleOpenRenameDialog = (
    projectId: string,
    currentName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setRenameTargetId(projectId);
    setRenameDraft(currentName);
  };

  const handleRenameProject = async () => {
    const name = renameDraft.trim();
    if (!name || !renameTargetId) return;
    setIsRenaming(true);
    try {
      await renameProject(renameTargetId, name);
      setRenameTargetId(null);
    } catch (error) {
      console.error("Failed to rename project:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.header
        variants={headerVariant}
        initial="hidden"
        animate="show"
        className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-10"
      >
        <div className="container mx-auto px-6 py-3.5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group cursor-pointer"
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

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <main className="container mx-auto px-6 py-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="max-w-6xl mx-auto space-y-8"
        >
          {/* ── Hero Greeting ────────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border-2 border-primary/20 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold text-base">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {getGreeting()},{" "}
                  <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {displayName}
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Here&apos;s an overview of your workspace.
                </p>
              </div>
            </div>

            {projects.length > 0 && !isLoading && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            )}
          </motion.div>

          {/* ── Stats Strip ──────────────────────────────────────────── */}
          {isLoading || statsLoading ? (
            <StatSkeletons />
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <StatCard
                icon={FolderKanban}
                label="Total Projects"
                value={projects.length}
                accent="bg-primary/10 text-primary"
              />
              <StatCard
                icon={LayoutTemplate}
                label="Templates"
                value={stats.totalTemplates}
                accent="bg-sky-500/10 text-sky-600 dark:text-sky-400"
              />
              <StatCard
                icon={Calendar}
                label="Autolists"
                value={stats.totalAutolists}
                accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              />
              <StatCard
                icon={LinkIcon}
                label="Connections"
                value={stats.totalConnections}
                accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              />
            </motion.div>
          )}

          <motion.div variants={fadeIn}>
            <Separator className="opacity-60" />
          </motion.div>

          {/* ── Projects Section ──────────────────────────────────────── */}
          <motion.section variants={fadeUp} className="space-y-5">
            {/* Section header with search */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Your Projects</h2>
                {!isLoading && projects.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary tabular-nums">
                    {projects.length}
                  </span>
                )}
              </div>

              {/* Search — only show when there are multiple projects */}
              {!isLoading && projects.length > 1 && (
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                  <Input
                    id="search-projects"
                    placeholder="Search projects…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm bg-muted/30 border-border/50 focus:bg-background transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Content states */}
            {isLoading ? (
              <SkeletonGrid />
            ) : projects.length === 0 ? (
              <EmptyState
                onCreateClick={() => setIsCreateDialogOpen(true)}
              />
            ) : filteredProjects.length === 0 ? (
              <motion.div variants={fadeIn}>
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center py-12 gap-2">
                    <Search className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No projects match &ldquo;{searchQuery}&rdquo;
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <AnimatePresence mode="popLayout">
                  {filteredProjects.map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={index}
                      onOpen={handleNavigateToProject}
                      onDelete={handleRequestDelete}
                      onRename={handleOpenRenameDialog}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.section>

          {/* ── Recent Activity Hint ─────────────────────────────────── */}
          {!isLoading && projects.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="bg-muted/30 border-border/40">
                <CardContent className="flex items-center gap-3 py-4 px-5">
                  <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-muted-foreground/70" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">
                      Tip: Open a project to manage ambassadors, create workflow
                      templates, and schedule publications.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* ── Create Project Dialog ──────────────────────────────────────── */}
      <ProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateProject}
      />

      {/* ── Rename Project Dialog ─────────────────────────────────────── */}
      <Dialog
        open={!!renameTargetId}
        onOpenChange={(open) => {
          if (!open) setRenameTargetId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename-project-input">New name</Label>
            <Input
              id="rename-project-input"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameProject();
              }}
              autoFocus
              disabled={isRenaming}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRenameTargetId(null)}
              disabled={isRenaming}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameProject}
              disabled={!renameDraft.trim() || isRenaming}
              className="cursor-pointer"
            >
              {isRenaming ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTargetName}</strong>?
              This will also remove the associated ambassador and all templates.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
