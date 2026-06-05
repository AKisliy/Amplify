"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export interface CpaDataPoint {
  label: string;
  cpa: number;
}

interface Props {
  data: CpaDataPoint[];
  isLoading: boolean;
  baseline: number;
  onBaseline: (v: number) => void;
}

const MUTED = "oklch(0.704 0.04 256.788)";
const GRID  = "oklch(1 0 0 / 0.06)";
const SKY   = "oklch(0.66 0.16 230)";

export function GlobalCpaEfficiencyChart({ data, isLoading, baseline, onBaseline }: Props) {
  const [localBaseline, setLocalBaseline] = useState(baseline);

  useEffect(() => { setLocalBaseline(baseline); }, [baseline]);

  const handleCommit = () => onBaseline(localBaseline);

  const maxY = Math.max(baseline + 2, ...data.map((d) => d.cpa)) * 1.1;

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        No data for the selected period
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 24, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            {/* Savings zone: below baseline = AI saves vs human */}
            <ReferenceArea
              y1={0}
              y2={baseline}
              fill="oklch(0.70 0.17 162)"
              fillOpacity={0.06}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: MUTED }}
              tickMargin={6}
            />
            <YAxis
              domain={[0, maxY]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: MUTED }}
              tickMargin={8}
              width={40}
              tickFormatter={(v) => `$${Number(v).toFixed(v < 10 ? 1 : 0)}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Daily CPA"]}
            />
            {/* Human baseline */}
            <ReferenceLine
              y={baseline}
              stroke="var(--foreground)"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
              label={{
                value: `Human · $${baseline.toFixed(2)}`,
                position: "right",
                fontSize: 10,
                fill: MUTED,
                offset: 4,
              }}
            />
            <Line
              type="monotone"
              dataKey="cpa"
              stroke={SKY}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: SKY, stroke: "var(--card)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm"
          style={{ background: "oklch(0 0 0 / 0.20)", border: "1px solid var(--border)" }}
        >
          <span className="text-xs text-muted-foreground font-medium">Human CPA</span>
          <span className="text-xs font-bold tabular-nums min-w-[44px]">
            ${localBaseline.toFixed(2)}
          </span>
          <input
            type="range"
            min={5}
            max={30}
            step={0.5}
            value={localBaseline}
            onChange={(e) => setLocalBaseline(Number(e.target.value))}
            onMouseUp={handleCommit}
            onTouchEnd={handleCommit}
            className="w-28"
            style={{ accentColor: "var(--primary)" }}
          />
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-px" style={{ borderTop: "2px solid " + SKY }} />
            Daily CPA
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-2 rounded-sm" style={{ background: "oklch(0.70 0.17 162 / 0.18)" }} />
            Savings zone
          </span>
        </div>
      </div>
    </div>
  );
}
