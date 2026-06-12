"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ModelSpendDto } from "@/lib/api/generated/userservice/types.gen";

const COLORS = [
  "var(--primary)",
  "var(--color-violet-500, #8b5cf6)",
  "var(--color-sky-500, #0ea5e9)",
  "var(--color-emerald-500, #10b981)",
  "var(--color-amber-500, #f59e0b)",
  "var(--color-rose-500, #f43f5e)",
];

const chartConfig = {
  costUsd: { label: "Cost (USD)" },
} satisfies ChartConfig;

interface SpendByModelChartProps {
  data: ModelSpendDto[];
  isLoading: boolean;
}

export function SpendByModelChart({ data, isLoading }: SpendByModelChartProps) {
  const chartData = data.map((d) => ({
    model: d.model ?? "unknown",
    costUsd: d.costUsd ?? 0,
    requests: d.requests ?? 0,
  }));

  // Short label for axis (last segment after /)
  const shortName = (m: string) => m.split("/").pop() ?? m;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Spend by Model</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            No data for the selected period
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-48 w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <YAxis
                dataKey="model"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={110}
                tickFormatter={shortName}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => `$${v.toFixed(3)}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
                  />
                }
              />
              <Bar dataKey="costUsd" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
