"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { EntityEfficiencyDto } from "@/lib/api/generated/userservice/types.gen";

const MUTED   = "oklch(0.704 0.04 256.788)";
const GRID    = "oklch(1 0 0 / 0.06)";
const EMERALD = "oklch(0.70 0.17 162)";
const ROSE    = "oklch(0.65 0.24 18)";
const PRIMARY = "oklch(0.62 0.21 264)";

interface Props {
  data: EntityEfficiencyDto[];
  isLoading: boolean;
}

export function GlobalEntityEfficiencyChart({ data, isLoading }: Props) {
  const { chartData, avgCpa } = useMemo(() => {
    const total = data.reduce((s, d) => s + (d.totalCostUsd ?? 0), 0);
    const jobs  = data.reduce((s, d) => s + (d.completedJobCount ?? 0), 0);
    const avg   = jobs > 0 ? total / jobs : 0;
    const chartData = data.map((d) => ({
      name:         (d.projectName ?? "?").split(" ")[0],
      fullName:     d.projectName ?? "Unknown",
      avgCpa:       d.avgCpa       ?? 0,
      totalCostUsd: d.totalCostUsd ?? 0,
      good:         (d.avgCpa ?? 0) < avg,
    }));
    return { chartData, avgCpa: avg };
  }, [data]);

  if (isLoading) return <Skeleton className="h-72 w-full" />;

  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
        No data for the selected period
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 24, right: 64, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--foreground)" }}
              tickMargin={6}
            />
            {/* Left Y — CPA */}
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: MUTED }}
              tickMargin={8}
              width={48}
              tickFormatter={(v) => `$${Number(v).toFixed(v < 10 ? 1 : 0)}`}
              label={{ value: "CPA ($)", position: "insideTopLeft", offset: -12, fontSize: 10, fill: EMERALD, fontWeight: 600 }}
            />
            {/* Right Y — Spend */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: MUTED }}
              tickMargin={8}
              width={60}
              tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`}
              label={{ value: "Spend ($)", position: "insideTopRight", offset: -12, fontSize: 10, fill: PRIMARY, fontWeight: 600 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) => [
                name === "avgCpa"
                  ? `$${typeof value === "number" ? value.toFixed(2) : value}`
                  : `$${typeof value === "number" ? Math.round(value).toLocaleString() : value}`,
                name === "avgCpa" ? "Avg CPA" : "Total Spend",
              ]}
            />
            <Bar yAxisId="left" dataKey="avgCpa" radius={[6, 6, 0, 0]} name="avgCpa">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.good ? EMERALD : ROSE} fillOpacity={0.85} />
              ))}
              <LabelList
                dataKey="avgCpa"
                position="top"
                formatter={(v) => typeof v === "number" ? `$${v.toFixed(2)}` : String(v)}
                style={{ fontSize: 11, fontWeight: 600, fill: "var(--foreground)" }}
              />
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalCostUsd"
              stroke={PRIMARY}
              strokeWidth={2.5}
              dot={{ r: 4.5, fill: "var(--card)", stroke: PRIMARY, strokeWidth: 2.5 }}
              name="totalCostUsd"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: EMERALD }} />
          {`CPA < $${avgCpa.toFixed(2)} (efficient)`}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: ROSE }} />
          {`CPA ≥ $${avgCpa.toFixed(2)} (inefficient)`}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5" style={{ background: PRIMARY }} />
          Total Spend
        </span>
      </div>
    </div>
  );
}
