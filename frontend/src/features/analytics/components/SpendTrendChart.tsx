"use client";

import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SpendTrendPointDto } from "@/lib/api/generated/userservice/types.gen";

const chartConfig = {
  costUsd: { label: "Cost (USD)", color: "var(--primary)" },
} satisfies ChartConfig;

interface SpendTrendChartProps {
  data: SpendTrendPointDto[];
  isLoading: boolean;
}

export function SpendTrendChart({ data, isLoading }: SpendTrendChartProps) {
  const chartData = data.map((d) => ({
    date: d.date!,
    costUsd: d.costUsd ?? 0,
    requests: d.requests ?? 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Daily Spend</CardTitle>
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
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => format(parseISO(v), "MMM d")}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={52}
                tickFormatter={(v) => `$${v.toFixed(3)}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
                    labelFormatter={(label) => format(parseISO(label), "MMM d, yyyy")}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="costUsd"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#fillCost)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
