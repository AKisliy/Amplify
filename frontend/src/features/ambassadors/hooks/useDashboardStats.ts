import { useState, useEffect, useCallback } from "react";
import { listTemplatesV1TemplatesGet } from "@/lib/api/template-service";
import { getAutoListsForProject } from "@/lib/api/publisher";
import { getApiConnections } from "@/lib/api/publisher";
import type { Project } from "../types";

export interface DashboardStats {
  totalTemplates: number;
  totalAutolists: number;
  totalConnections: number;
}

/**
 * Aggregates real stats across all user projects:
 *  - Total Templates (via listTemplates — returns all user templates)
 *  - Total Autolists (aggregated per-project)
 *  - Total Social Connections (aggregated per-project)
 */
export function useDashboardStats(projects: Project[]) {
  const [stats, setStats] = useState<DashboardStats>({
    totalTemplates: 0,
    totalAutolists: 0,
    totalConnections: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (projects.length === 0) {
      setStats({ totalTemplates: 0, totalAutolists: 0, totalConnections: 0 });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // ── Templates: single call returns ALL user templates ────────────
      const templatesPromise = listTemplatesV1TemplatesGet()
        .then((res) => (res.data ?? []).length)
        .catch(() => 0);

      // ── Autolists: per-project, aggregate ───────────────────────────
      const autolistsPromise = Promise.all(
        projects.map((p) =>
          getAutoListsForProject({ query: { ProjectId: p.id } })
            .then((res) => (res.data?.autoLists ?? []).length)
            .catch(() => 0)
        )
      ).then((counts) => counts.reduce((sum, c) => sum + c, 0));

      // ── Connections: per-project, aggregate ─────────────────────────
      const connectionsPromise = Promise.all(
        projects.map((p) =>
          getApiConnections({ path: { projectId: p.id } })
            .then((res) => (res.data?.connections ?? []).length)
            .catch(() => 0)
        )
      ).then((counts) => counts.reduce((sum, c) => sum + c, 0));

      const [totalTemplates, totalAutolists, totalConnections] =
        await Promise.all([
          templatesPromise,
          autolistsPromise,
          connectionsPromise,
        ]);

      setStats({ totalTemplates, totalAutolists, totalConnections });
    } catch (err) {
      console.error("[useDashboardStats] Failed to fetch stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [projects]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading };
}
