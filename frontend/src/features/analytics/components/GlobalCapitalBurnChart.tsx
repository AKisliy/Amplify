"use client";

import { useMemo } from "react";
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

// Design-system PALETTE colors — same semantic mapping as the design
const MODEL_COLORS: Record<string, string> = {
  veo3:        "oklch(0.65 0.24 18)",    // rose — Veo / Google
  elevenlabs:  "oklch(0.66 0.16 230)",   // sky — ElevenLabs
  openai:      "oklch(0.70 0.17 162)",   // emerald — OpenAI / Whisper
};
const FALLBACK_COLORS = [
  "oklch(0.62 0.21 264)",  // primary violet
  "oklch(0.78 0.17 75)",   // amber
  "oklch(0.65 0.24 295)",  // violet
];

// Match model name to semantic slot
function slotColor(model: string, fallbackIdx: number): string {
  const m = model.toLowerCase();
  if (m.includes("veo"))         return MODEL_COLORS.veo3;
  if (m.includes("eleven"))      return MODEL_COLORS.elevenlabs;
  if (m.includes("openai") || m.includes("whisper") || m.includes("gpt") || m.includes("tts"))
    return MODEL_COLORS.openai;
  return FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
}

const MUTED = "oklch(0.704 0.04 256.788)";
const GRID  = "oklch(1 0 0 / 0.06)";

interface Props {
  data: CapitalBurnPointDto[];
  isLoading: boolean;
}

export function GlobalCapitalBurnChart({ data, isLoading }: Props) {
  const { chartData, models } = useMemo(() => {
    const modelSet = new Set<string>();
    data.forEach((d) => { if (d.model) modelSet.add(d.model); });
    const models = Array.from(modelSet).sort();

    const byDate = new Map<string, Record<string, number>>();
    data.forEach((d) => {
      if (!d.date) return;
      if (!byDate.has(d.date)) byDate.set(d.date, {});
      const row = byDate.get(d.date)!;
      const key = d.model ?? "unknown";
      row[key] = (row[key] ?? 0) + (d.costUsd ?? 0);
    });

    const chartData = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, row]) => {
        const day = new Date(date).getDate();
        return { date: String(day), ...row };
      });

    return { chartData, models };
  }, [data]);

  if (isLoading) return <Skeleton className="h-56 w-full" />;

  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
        No data for the selected period
      </div>
    );
  }

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
          <defs>
            {models.map((model, i) => {
              const color = slotColor(model, i);
              return (
                <linearGradient key={model} id={`burn-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
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
            interval={4}
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
          {/* Stack order: openai bottom → elevenlabs → veo3 top (matches design) */}
          {models.map((model, i) => (
            <Area
              key={model}
              type="monotone"
              dataKey={model}
              stackId="burn"
              stroke={slotColor(model, i)}
              fill={`url(#burn-grad-${i})`}
              strokeWidth={1.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
