"use client";

import { LayoutTemplate } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TemplateSpendDto } from "@/lib/api/generated/userservice/types.gen";

interface SpendByTemplateTableProps {
  data: TemplateSpendDto[];
  isLoading: boolean;
}

function shortId(id: string) {
  return id.slice(0, 8) + "…";
}

function fmtK(n: number | undefined) {
  const v = n ?? 0;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
}

export function SpendByTemplateTable({ data, isLoading }: SpendByTemplateTableProps) {
  const maxCost = Math.max(...data.map((d) => d.costUsd ?? 0), 0.0001);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Spend by Template</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="space-y-2 px-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            No data for the selected period
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="w-28">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const pct = ((row.costUsd ?? 0) / maxCost) * 100;
                return (
                  <TableRow key={row.templateId} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {shortId(row.templateId ?? "")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${(row.costUsd ?? 0).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {fmtK(row.tokens)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono">
                        {row.jobCount ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
