"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/features/analytics/components/DateRangePicker";
import { SpendSummaryCards } from "@/features/analytics/components/SpendSummaryCards";
import { SpendTrendChart } from "@/features/analytics/components/SpendTrendChart";
import { SpendModelRow } from "@/features/analytics/components/SpendModelRow";
import { SpendByTemplateTable } from "@/features/analytics/components/SpendByTemplateTable";
import { SpendByJobTable } from "@/features/analytics/components/SpendByJobTable";
import {
  useDefaultRange,
  useSpendSummary,
  useSpendTrend,
  useSpendByModel,
  useSpendByTemplate,
  useSpendByJob,
  type DateRange,
} from "@/features/analytics/hooks/useAnalytics";

export default function AnalyticsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const defaultRange = useDefaultRange();
  const [range, setRange] = useState<DateRange>(defaultRange);

  const { data: summary, isLoading: summaryLoading } = useSpendSummary(projectId, range);
  const { data: trend, isLoading: trendLoading } = useSpendTrend(projectId, range);
  const { data: byModel, isLoading: modelLoading } = useSpendByModel(projectId, range);
  const { data: byTemplate, isLoading: templateLoading } = useSpendByTemplate(projectId, range);
  const { data: byJob, isLoading: jobLoading } = useSpendByJob(projectId, range);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-6xl space-y-6">

        {/* Page header — same style as Assets page */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-end justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary/70" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                Cost Tracking
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white/90 tracking-tight">Analytics</h1>
            <p className="text-sm text-white/35 mt-1.5">
              AI generation spend broken down by model, template, and job.
            </p>
          </div>
          <DateRangePicker value={range} onChange={setRange} />
        </motion.div>

        {/* KPI cards */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <SpendSummaryCards data={summary} isLoading={summaryLoading} />
        </motion.div>

        {/* Trend chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SpendTrendChart data={trend} isLoading={trendLoading} />
        </motion.div>

        {/* Model breakdown — donut + bar side by side */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <SpendModelRow data={byModel ?? []} isLoading={modelLoading} />
        </motion.div>

        {/* Breakdowns by template / job */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Tabs defaultValue="template">
            <TabsList className="mb-4">
              <TabsTrigger value="template">By Template</TabsTrigger>
              <TabsTrigger value="job">By Job</TabsTrigger>
            </TabsList>
            <TabsContent value="template">
              <SpendByTemplateTable data={byTemplate} isLoading={templateLoading} />
            </TabsContent>
            <TabsContent value="job">
              <SpendByJobTable data={byJob} isLoading={jobLoading} />
            </TabsContent>
          </Tabs>
        </motion.div>

      </div>
    </div>
  );
}
