"use client";

import { format, parseISO } from "date-fns";
import { Clapperboard } from "lucide-react";
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
import type { JobSpendDto } from "@/lib/api/generated/userservice/types.gen";

interface SpendByJobTableProps {
  data: JobSpendDto[];
  isLoading: boolean;
}

function shortId(id: string | null | undefined) {
  return id ? id.slice(0, 8) + "…" : "—";
}

function fmtK(n: number | undefined) {
  const v = n ?? 0;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
}

export function SpendByJobTable({ data, isLoading }: SpendByJobTableProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Spend by Job</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="space-y-2 px-6">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            No data for the selected period
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Job</TableHead>
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.jobId} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Clapperboard className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span className="font-mono text-xs">{shortId(row.jobId)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {shortId(row.templateId)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    ${(row.costUsd ?? 0).toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {fmtK(row.tokens)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="font-mono">
                      {row.requests ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.startedAt
                      ? format(parseISO(row.startedAt), "MMM d, HH:mm")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
