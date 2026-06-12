"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  LayoutTemplate,
  Calendar,
  Link as LinkIcon,
  DollarSign,
  TrendingDown,
  Video,
  Zap,
  Flame,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "./DateRangePicker";
import { GlobalCapitalBurnChart } from "./GlobalCapitalBurnChart";
import { GlobalCpaEfficiencyChart } from "./GlobalCpaEfficiencyChart";
import { GlobalOutputVolumeChart } from "./GlobalOutputVolumeChart";
import { GlobalEntityEfficiencyChart } from "./GlobalEntityEfficiencyChart";
import {
  useGlobalSpendSummary,
  useGlobalSpendTrend,
  useGlobalCapitalBurn,
  useGlobalOutputVolume,
  useEntityEfficiency,
  useDefaultGlobalRange,
} from "../hooks/useGlobalAnalytics";
import type { DashboardStats } from "@/features/ambassadors/hooks/useDashboardStats";

// ─── Palette tokens (match design system) ──────────────────────────────────

const PALETTE = {
  primary:   "oklch(0.62 0.21 264)",
  emerald:   "oklch(0.70 0.17 162)",
  sky:       "oklch(0.66 0.16 230)",
  rose:      "oklch(0.65 0.24 18)",
  amber:     "oklch(0.78 0.17 75)",
  violet:    "oklch(0.65 0.24 295)",
  muted:     "oklch(0.704 0.04 256.788)",
  border:    "oklch(1 0 0 / 0.10)",
  borderSoft:"oklch(1 0 0 / 0.06)",
  card:      "oklch(0.208 0.042 265.755)",
  fg:        "oklch(0.984 0.003 247.858)",
};

// ─── Eyebrow label ──────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.muted }}>
      {children}
    </div>
  );
}

// ─── Inline KPI (inside chart card header) ─────────────────────────────────

function InlineKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 14px", borderLeft: `1px solid ${PALETTE.borderSoft}` }}>
      <Eyebrow>{label}</Eyebrow>
      <span style={{ fontSize: 16, fontWeight: 700, color: color ?? PALETTE.fg, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  delta?: string;
  sub?: string;
  accentColor?: string;
  hasAccentStripe?: boolean;
  isGoodDelta?: boolean;
  isLoading?: boolean;
}

function KpiCard({ icon: Icon, label, value, delta, sub, accentColor, hasAccentStripe, isGoodDelta, isLoading }: KpiCardProps) {
  const color = accentColor ?? PALETTE.fg;
  return (
    <div
      style={{
        background: PALETTE.card,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        overflow: "hidden",
        transition: "transform .12s, border-color .12s",
      }}
    >
      {hasAccentStripe && (
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: color, opacity: 0.85 }} />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: hasAccentStripe ? `${color.replace(")", " / 0.14)")}` : "oklch(1 0 0 / 0.06)",
            color: hasAccentStripe ? color : PALETTE.fg,
          }}>
            <Icon size={14} />
          </span>
          <span style={{ fontSize: 12, color: PALETTE.muted, fontWeight: 500 }}>{label}</span>
        </div>
        {delta && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
            background: isGoodDelta ? "oklch(0.70 0.17 162 / 0.10)" : "oklch(0.65 0.24 18 / 0.10)",
            color: isGoodDelta ? PALETTE.emerald : PALETTE.rose,
          }}>{delta}</span>
        )}
      </div>
      <div>
        {isLoading ? (
          <>
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </>
        ) : (
          <>
            <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: PALETTE.fg }}>
              {value}
            </span>
            {sub && <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 2 }}>{sub}</div>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── KPI Row ────────────────────────────────────────────────────────────────

function KpiRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Eyebrow>{title}</Eyebrow>
        <div style={{ flex: 1, height: 1, background: PALETTE.borderSoft }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Chart card shell ───────────────────────────────────────────────────────

function ChartCard({
  title,
  badge,
  description,
  kpis,
  legend,
  controls,
  children,
}: {
  title: string;
  badge?: string;
  description?: string;
  kpis?: { label: string; value: string; color?: string }[];
  legend?: React.ReactNode;
  controls?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14,
      padding: 22, display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: PALETTE.fg }}>{title}</h2>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999,
              background: "oklch(1 0 0 / 0.06)", color: PALETTE.muted, letterSpacing: "0.04em", textTransform: "uppercase" as const,
            }}>{badge}</span>
          )}
          {description && <span style={{ fontSize: 12, color: PALETTE.muted }}>{description}</span>}
        </div>
        {kpis && kpis.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {kpis.map((k, i) => <InlineKpi key={i} {...k} />)}
          </div>
        )}
        {controls}
      </div>
      {legend && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>{legend}</div>
      )}
      <div>{children}</div>
    </div>
  );
}

// ─── Project performance card (read-only, links to project) ─────────────────

function ProjectPerfCard({
  projectId, name, description, spent, videos, cpa, avgCpa,
}: {
  projectId: string;
  name: string;
  description?: string | null;
  spent: number;
  videos: number;
  cpa: number;
  avgCpa: number;
}) {
  const router = useRouter();
  const isGood = cpa < avgCpa && avgCpa > 0;

  return (
    <div
      onClick={() => router.push(`/projects/${projectId}`)}
      style={{
        background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 12,
        padding: 18, display: "flex", flexDirection: "column", gap: 12,
        transition: "transform .15s, border-color .15s, box-shadow .15s", cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "oklch(0.62 0.21 264 / 0.4)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 30px -10px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
        (e.currentTarget as HTMLDivElement).style.borderColor = PALETTE.border;
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "oklch(0.62 0.21 264 / 0.20)", color: PALETTE.primary,
        }}>
          <FolderKanban size={16} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: PALETTE.fg }}>{name}</div>
        {description && (
          <div style={{
            fontSize: 12, color: PALETTE.muted, marginTop: 4, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{description}</div>
        )}
      </div>
      <div style={{
        display: "flex", gap: 10, alignItems: "center", fontSize: 11, color: PALETTE.muted,
        fontVariantNumeric: "tabular-nums", paddingTop: 8, borderTop: `1px dashed ${PALETTE.borderSoft}`,
      }}>
        <span>
          <strong style={{ color: PALETTE.fg, fontWeight: 600 }}>${spent.toLocaleString()}</strong> spent
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>
          <strong style={{ color: PALETTE.fg, fontWeight: 600 }}>{videos}</strong> videos
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>
          <strong style={{ color: isGood ? PALETTE.emerald : PALETTE.rose, fontWeight: 600 }}>
            ${cpa.toFixed(2)}
          </strong> CPA
        </span>
      </div>
    </div>
  );
}

// ─── LegendDot ──────────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
      <span style={{ fontSize: 11, color: PALETTE.muted }}>{label}</span>
    </span>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export interface GlobalAnalyticsSectionProps {
  projectCount: number;
  stats: DashboardStats;
  statsLoading: boolean;
  projects: { id: string; name: string; description?: string | null }[];
}

const HUMAN_BASELINE_KEY = "amp.humanBaseline";
const DEFAULT_BASELINE   = 15.0;

export function GlobalAnalyticsSection({
  projectCount, stats, statsLoading, projects,
}: GlobalAnalyticsSectionProps) {
  const defaultRange = useDefaultGlobalRange();
  const [range, setRange]       = useState(defaultRange);
  const [baseline, setBaseline] = useState(DEFAULT_BASELINE);

  useEffect(() => {
    const saved = localStorage.getItem(HUMAN_BASELINE_KEY);
    if (saved) setBaseline(Number(saved));
  }, []);

  const handleBaseline = (v: number) => {
    setBaseline(v);
    localStorage.setItem(HUMAN_BASELINE_KEY, String(v));
  };

  const { data: summary,    isLoading: summaryLoading } = useGlobalSpendSummary(range);
  const { data: trendData,  isLoading: trendLoading }   = useGlobalSpendTrend(range);
  const { data: volumeData, isLoading: volumeLoading }  = useGlobalOutputVolume(range);
  const { data: burnData,   isLoading: burnLoading }    = useGlobalCapitalBurn(range);
  const { data: entityData, isLoading: entityLoading }  = useEntityEfficiency(range);

  // Financial KPI values — prefer summary when available, fall back to aggregating chart data
  const totalSpend = summary?.totalCostUsd
    ?? burnData.reduce((s, d) => s + (d.costUsd ?? 0), 0);
  const completedJobs = summary?.completedJobCount
    ?? volumeData.reduce((s, d) => s + (d.completed ?? 0), 0);
  const failedJobs = summary?.failedJobCount
    ?? volumeData.reduce((s, d) => s + (d.failed ?? 0), 0);
  const avgCpa    = completedJobs > 0 ? totalSpend / completedJobs : 0;
  const arbitrage = baseline > 0 ? ((baseline - avgCpa) / baseline * 100) : 0;

  // CPA efficiency: join trend (daily cost) + volume (daily jobs) by date
  const cpaData = useMemo(() => {
    const costByDate = new Map<string, number>();
    trendData.forEach((d) => { if (d.date) costByDate.set(d.date, d.costUsd ?? 0); });
    return volumeData
      .filter((d) => d.date && (d.completed ?? 0) > 0)
      .map((d) => {
        const cost = costByDate.get(d.date!) ?? 0;
        const cpa  = cost / (d.completed!);
        const day  = new Date(d.date!).getDate();
        return { label: String(day), cpa };
      });
  }, [trendData, volumeData]);

  // Burn totals for legend
  const burnTotals = useMemo(() => {
    const map = new Map<string, number>();
    burnData.forEach((d) => {
      if (!d.model) return;
      map.set(d.model, (map.get(d.model) ?? 0) + (d.costUsd ?? 0));
    });
    return map;
  }, [burnData]);

  // Entity data mapped to projects for the perf grid
  const projectPerfMap = useMemo(() => {
    const m = new Map<string, typeof entityData[number]>();
    entityData.forEach((e) => { if (e.projectId) m.set(e.projectId, e); });
    return m;
  }, [entityData]);

  const globalAvgCpa = useMemo(() => {
    const totalC = entityData.reduce((s, d) => s + (d.totalCostUsd ?? 0), 0);
    const totalJ = entityData.reduce((s, d) => s + (d.completedJobCount ?? 0), 0);
    return totalJ > 0 ? totalC / totalJ : 0;
  }, [entityData]);

  const isCpaLoading = trendLoading || volumeLoading || burnLoading || summaryLoading;

  return (
    <section className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Performance Overview</h2>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Operational KPI row */}
      <KpiRow title="Operational">
        <KpiCard
          icon={FolderKanban}
          label="Total Projects"
          value={String(projectCount)}
          isLoading={false}
        />
        <KpiCard
          icon={LayoutTemplate}
          label="Templates"
          value={String(stats.totalTemplates)}
          isLoading={statsLoading}
        />
        <KpiCard
          icon={Calendar}
          label="Autolists"
          value={String(stats.totalAutolists)}
          sub="queued & scheduled"
          isLoading={statsLoading}
        />
        <KpiCard
          icon={LinkIcon}
          label="Connections"
          value={String(stats.totalConnections)}
          sub={`across ${projectCount} projects`}
          isLoading={statsLoading}
        />
      </KpiRow>

      {/* Financial KPI row */}
      <KpiRow title="Financial · Last 30 days">
        <KpiCard
          icon={DollarSign}
          label="Total Spend"
          value={`$${totalSpend.toFixed(2)}`}
          sub="last 30 days"
          accentColor={PALETTE.primary}
          hasAccentStripe
          isLoading={summaryLoading}
        />
        <KpiCard
          icon={TrendingDown}
          label="Avg CPA"
          value={`$${avgCpa.toFixed(2)}`}
          sub={`vs $${baseline.toFixed(2)} baseline`}
          delta={avgCpa > 0 ? `−$${(baseline - avgCpa).toFixed(2)}` : undefined}
          isGoodDelta
          accentColor={PALETTE.emerald}
          hasAccentStripe
          isLoading={summaryLoading}
        />
        <KpiCard
          icon={Video}
          label="Videos Generated"
          value={completedJobs.toLocaleString()}
          sub="completed jobs"
          accentColor={PALETTE.sky}
          hasAccentStripe
          isLoading={summaryLoading}
        />
        <KpiCard
          icon={Zap}
          label="Arbitrage Margin"
          value={arbitrage > 0 ? `${arbitrage.toFixed(1)}%` : "—"}
          sub={`vs $${baseline.toFixed(2)} baseline`}
          delta={arbitrage > 0 ? `+${arbitrage.toFixed(1)}%` : undefined}
          isGoodDelta
          accentColor={PALETTE.violet}
          hasAccentStripe
          isLoading={summaryLoading}
        />
      </KpiRow>

      {/* Capital Burn — full width */}
      <ChartCard
        title="Capital Burn"
        badge="Last 30 days"
        kpis={burnLoading ? [] : [
          { label: "Total Burn",  value: `$${totalSpend.toFixed(2)}` },
          { label: "Daily Avg",   value: `$${(totalSpend / 30).toFixed(2)}` },
        ]}
        legend={
          <div className="flex gap-4 flex-wrap">
            {Array.from(burnTotals.entries()).map(([model, cost]) => (
              <LegendDot key={model} color={burnData.find((d) => d.model === model) ? "oklch(0.65 0.24 18)" : "oklch(0.70 0.17 162)"} label={`${model.split("/").pop() ?? model} · $${cost.toFixed(0)}`} />
            ))}
          </div>
        }
      >
        <GlobalCapitalBurnChart data={burnData} isLoading={burnLoading} />
      </ChartCard>

      {/* CPA Efficiency (60%) + Output Volume (40%) */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <ChartCard
          title="CPA Efficiency"
          description="vs human production baseline"
          kpis={isCpaLoading ? [] : [
            { label: "Avg AI CPA",    value: `$${avgCpa.toFixed(2)}`,     color: PALETTE.sky },
            { label: "Baseline",      value: `$${baseline.toFixed(2)}`,   color: PALETTE.fg },
            { label: "Arbitrage",     value: `${arbitrage.toFixed(1)}%`,  color: PALETTE.emerald },
          ]}
        >
          <GlobalCpaEfficiencyChart
            data={cpaData}
            isLoading={isCpaLoading}
            baseline={baseline}
            onBaseline={handleBaseline}
          />
        </ChartCard>

        <ChartCard
          title="Output Volume"
          description="By week"
          kpis={volumeLoading ? [] : [
            { label: "Total Output", value: `${completedJobs + failedJobs} vids`, color: PALETTE.fg },
            { label: "Failed",       value: String(failedJobs),                   color: PALETTE.rose },
          ]}
        >
          <GlobalOutputVolumeChart data={volumeData} isLoading={volumeLoading} />
        </ChartCard>
      </div>

      {/* Projects performance grid */}
      {projects.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: PALETTE.fg }}>Your Projects</h2>
            <span style={{
              display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 999,
              background: "oklch(1 0 0 / 0.06)", color: PALETTE.muted, fontSize: 11, fontWeight: 600,
            }}>{projects.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {projects.map((p) => {
              const perf = projectPerfMap.get(p.id);
              return (
                <ProjectPerfCard
                  key={p.id}
                  projectId={p.id}
                  name={p.name}
                  description={p.description}
                  spent={perf?.totalCostUsd ?? 0}
                  videos={perf?.completedJobCount ?? 0}
                  cpa={perf?.avgCpa ?? 0}
                  avgCpa={globalAvgCpa}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Entity Efficiency — full width */}
      <ChartCard
        title="Project Efficiency"
        description="Cost per asset vs total spend allocation"
        kpis={entityLoading ? [] : [
          { label: "Global Avg CPA",  value: `$${globalAvgCpa.toFixed(2)}`,         color: PALETTE.fg },
          { label: "Best Performer",  value: entityData[entityData.length - 1]?.projectName?.split(" ")[0] ?? "—", color: PALETTE.emerald },
          { label: "Worst Performer", value: entityData[0]?.projectName?.split(" ")[0] ?? "—", color: PALETTE.rose },
        ]}
      >
        <GlobalEntityEfficiencyChart data={entityData} isLoading={entityLoading} />
      </ChartCard>
    </section>
  );
}
