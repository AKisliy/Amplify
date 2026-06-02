"use client";

import { DollarSign, Zap, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SpendSummaryDto } from "@/lib/api/generated/userservice/types.gen";

function fmt(n: number | undefined, decimals = 4) {
  return (n ?? 0).toFixed(decimals);
}

function fmtK(n: number | undefined) {
  const v = n ?? 0;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
}

interface SpendSummaryCardsProps {
  data: SpendSummaryDto | null;
  isLoading: boolean;
}

export function SpendSummaryCards({ data, isLoading }: SpendSummaryCardsProps) {
  const cards = [
    {
      title: "Total Cost",
      value: `$${fmt(data?.totalCostUsd)}`,
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Total Tokens",
      value: fmtK(data?.totalTokens),
      icon: Zap,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      title: "API Requests",
      value: String(data?.requestCount ?? 0),
      icon: Activity,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.title} className="py-5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{c.value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
