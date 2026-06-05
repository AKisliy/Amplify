"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { Plus, Home, Layers, Sparkles } from "lucide-react";

import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { GlobalAnalyticsSection } from "@/features/analytics/components/GlobalAnalyticsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { projects, isLoading, createProject } = useProjects();
  const { stats, isLoading: statsLoading } = useDashboardStats(projects);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const displayName = user?.email?.split("@")[0] || "User";
  const initials = getInitials(displayName);

  const handleCreateProject = async (values: ProjectFormValues) => {
    try {
      await createProject(values);
    } catch (error) {
      console.error("Failed to create project:", error);
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

          {/* ── Performance Overview (KPIs + Charts + Projects perf) ── */}
          <motion.div variants={fadeUp}>
            <GlobalAnalyticsSection
              projectCount={projects.length}
              stats={stats}
              statsLoading={statsLoading || isLoading}
              projects={projects}
            />
          </motion.div>

          {/* ── Empty State — only when no projects yet ──────────────── */}
          {!isLoading && projects.length === 0 && (
            <motion.div variants={scaleIn}>
              <EmptyState onCreateClick={() => setIsCreateDialogOpen(true)} />
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

    </div>
  );
}
