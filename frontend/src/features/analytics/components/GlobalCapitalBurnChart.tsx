"use client";

import { useMemo } from "react";
import { eachDayOfInterval, format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { CapitalBurnPointDto } from "@/lib/api/generated/userservice/types.gen";

// djb2 hash → hue (0–359)
function hashHue(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return Math.abs(h) % 360;
}

/** Deterministic color for any model name. Exported for legend use. */
export function modelColor(model: string): string {
  return `oklch(0.68 0.18 ${hashHue(model)})`;
}

// Sanitize model name → safe CSS id fragment
function gradId(model: string): string {
  return `burn-grad-${model.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

const MUTED = "oklch(0.704 0.04 256.788)";
const GRID  = "oklch(1 0 0 / 0.06)";

interface Props {
  data: CapitalBurnPointDto[];
  isLoading: boolean;
  from: Date;
  to: Date;
}

export function GlobalCapitalBurnChart({ data, isLoading, from, to }: Props) {
  const { chartData, models } = useMemo(() => {
    const modelSet = new Set<string>();
    data.forEach((d) => { if (d.model) modelSet.add(d.model); });
    const models = Array.from(modelSet).sort();

    const byDate = new Map<string, Record<string, number>>();
    data.forEach((d) => {
      if (!d.date) return;
      const key = d.date;
      if (!byDate.has(key)) byDate.set(key, {});
      const row = byDate.get(key)!;
      const model = d.model ?? "unknown";
      row[model] = (row[model] ?? 0) + (d.costUsd ?? 0);
    });

    // Explicitly zero all model keys for every day in the selected period.
    // Recharts stacked areas render invisible segments when values are undefined.
    const emptyRow = Object.fromEntries(models.map((m) => [m, 0]));
    const chartData = eachDayOfInterval({ start: from, end: to }).map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const row = byDate.get(key) ?? {};
      return { date: format(day, "MMM d"), ...emptyRow, ...row };
    });

    return { chartData, models };
  }, [data, from, to]);

  if (isLoading) return <Skeleton className="h-56 w-full" />;

  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
        No data for the selected period
      </div>
    );
  }

  return (
    <div style={{ height: 220, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
          <defs>
            {models.map((model) => {
              const color = modelColor(model);
              return (
                <linearGradient key={model} id={gradId(model)} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: MUTED }}
            tickMargin={6}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: MUTED }}
            tickMargin={8}
            width={48}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => [
              typeof value === "number" ? `$${value.toFixed(2)}` : String(value),
              String(name).split("/").pop() ?? String(name),
            ]}
          />
          {models.map((model) => (
            <Area
              key={model}
              type="monotone"
              dataKey={model}
              stackId="burn"
              stroke={modelColor(model)}
              fill={`url(#${gradId(model)})`}
              strokeWidth={1.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
