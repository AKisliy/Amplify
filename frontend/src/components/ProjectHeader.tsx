"use client";

import { useRouter, useParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { User, Calendar, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";
import { ProjectSelector } from "@/features/ambassadors/components/ProjectSelector";
import type { Project } from "@/features/ambassadors/types";

interface ProjectHeaderProps {
  projects: Project[];
  isLoading?: boolean;
}

export function ProjectHeader({ projects, isLoading }: ProjectHeaderProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const projectId = params?.projectId as string;

  const isAmbassadorPage = pathname?.includes("/ambassadors");
  const isAutolistsPage = pathname?.includes("/autolists");

  const handleLogoClick = () => {
    router.push("/dashboard");
  };

  const handleTabClick = (tab: "ambassadors" | "autolists") => {
    if (!projectId) return;
    router.push(`/projects/${projectId}/${tab}`);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Home className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Amplify
              </span>
            </button>

            {/* Navigation Tabs */}
            {projectId && (
              <>
                <div className="h-6 w-px bg-border" />
                <nav className="flex items-center gap-2">
                  <button
                    onClick={() => handleTabClick("ambassadors")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      "hover:bg-muted/80",
                      isAmbassadorPage
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Ambassador
                    </div>
                  </button>
                  <button
                    onClick={() => handleTabClick("autolists")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      "hover:bg-muted/80",
                      isAutolistsPage
                        ? "bg-pink-500/10 text-pink-600"
                        : "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Autolists
                    </div>
                  </button>
                </nav>
              </>
            )}

            {/* Project Selector */}
            {projectId && (
              <>
                <div className="h-6 w-px bg-border" />
                <ProjectSelector projects={projects} isLoading={isLoading} />
              </>
            )}
          </div>

          <UserMenu />
        </div>
      </div>
    </motion.header>
  );
}
