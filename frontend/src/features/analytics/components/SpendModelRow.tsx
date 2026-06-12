"use client";

import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis, Label } from "recharts";
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
  "#8b5cf6",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
];

const chartConfig = {
  costUsd: { label: "Cost (USD)" },
} satisfies ChartConfig;

interface Props {
  data: ModelSpendDto[];
  isLoading: boolean;
}

export function SpendModelRow({ data, isLoading }: Props) {
  const chartData = data.map((d) => ({
    model: d.model ?? "unknown",
    costUsd: d.costUsd ?? 0,
    requests: d.requests ?? 0,
  }));

  const total = chartData.reduce((sum, d) => sum + d.costUsd, 0);
  const shortName = (m: string) => m.split("/").pop() ?? m;

  const pieData = chartData.map((d, i) => ({
    name: shortName(d.model),
    value: d.costUsd,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Donut chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Model Cost Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : data.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              No data for the selected period
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                  formatter={(value, name) => [name, ` $${Number(value).toFixed(4)}`]}
                />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={64}
                  outerRadius={96}
                  strokeWidth={2}
                  stroke="var(--background)"
                >
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                      const { cx, cy } = viewBox as { cx: number; cy: number };
                      return (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan
                            x={cx}
                            y={cy - 8}
                            className="fill-foreground text-xl font-bold"
                            fontSize={18}
                            fontWeight={700}
                          >
                            ${total.toFixed(4)}
                          </tspan>
                          <tspan
                            x={cx}
                            y={cy + 12}
                            className="fill-muted-foreground text-xs"
                            fontSize={11}
                            fill="currentColor"
                            opacity={0.5}
                          >
                            total
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Horizontal bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Spend by Model</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : data.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              No data for the selected period
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-56 w-full">
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
    </div>
  );
}
