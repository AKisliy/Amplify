"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { OutputVolumeDto } from "@/lib/api/generated/userservice/types.gen";

const MUTED = "oklch(0.704 0.04 256.788)";
const GRID  = "oklch(1 0 0 / 0.06)";
const COMPLETED_COLOR = "oklch(0.70 0.17 162)";  // emerald
const FAILED_COLOR    = "oklch(0.65 0.24 18)";    // rose

interface Props {
  data: OutputVolumeDto[];
  isLoading: boolean;
}

function groupByWeek(data: OutputVolumeDto[]) {
  const weeks = new Map<string, { completed: number; failed: number }>();
  data.forEach((d) => {
    if (!d.date) return;
    const date = new Date(d.date);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(date);
    monday.setDate(diff);
    const key = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const row = weeks.get(key) ?? { completed: 0, failed: 0 };
    row.completed += d.completed ?? 0;
    row.failed    += d.failed    ?? 0;
    weeks.set(key, row);
  });
  return Array.from(weeks.entries()).map(([week, s]) => ({ week, ...s }));
}

export function GlobalOutputVolumeChart({ data, isLoading }: Props) {
  const chartData = useMemo(() => groupByWeek(data), [data]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        No data for the selected period
      </div>
    );
  }

  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: MUTED }}
            tickMargin={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: MUTED }}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
          <Bar dataKey="completed" stackId="v" fill={COMPLETED_COLOR} opacity={0.85} radius={[0, 0, 0, 0]} name="Completed" />
          <Bar dataKey="failed"    stackId="v" fill={FAILED_COLOR}    opacity={0.85} radius={[4, 4, 0, 0]} name="Failed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
