"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DateRangePicker } from "@/features/analytics/components/DateRangePicker";
import { SpendSummaryCards } from "@/features/analytics/components/SpendSummaryCards";
import { SpendTrendChart } from "@/features/analytics/components/SpendTrendChart";
import { SpendByModelChart } from "@/features/analytics/components/SpendByModelChart";
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
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [range, setRange] = useState<DateRange>(useDefaultRange());

  const { data: summary, isLoading: summaryLoading } = useSpendSummary(projectId, range);
  const { data: trend, isLoading: trendLoading } = useSpendTrend(projectId, range);
  const { data: byModel, isLoading: modelLoading } = useSpendByModel(projectId, range);
  const { data: byTemplate, isLoading: templateLoading } = useSpendByTemplate(projectId, range);
  const { data: byJob, isLoading: jobLoading } = useSpendByJob(projectId, range);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="hover:bg-muted/80"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-semibold">Analytics</h1>
              </div>
            </div>
            <DateRangePicker value={range} onChange={setRange} />
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8 max-w-6xl space-y-6">
        {/* KPI cards */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <SpendSummaryCards data={summary} isLoading={summaryLoading} />
        </motion.div>

        {/* Trend chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SpendTrendChart data={trend} isLoading={trendLoading} />
        </motion.div>

        {/* Breakdowns */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Tabs defaultValue="model">
            <TabsList className="mb-4">
              <TabsTrigger value="model">By Model</TabsTrigger>
              <TabsTrigger value="template">By Template</TabsTrigger>
              <TabsTrigger value="job">By Job</TabsTrigger>
            </TabsList>
            <TabsContent value="model">
              <SpendByModelChart data={byModel} isLoading={modelLoading} />
            </TabsContent>
            <TabsContent value="template">
              <SpendByTemplateTable data={byTemplate} isLoading={templateLoading} />
            </TabsContent>
            <TabsContent value="job">
              <SpendByJobTable data={byJob} isLoading={jobLoading} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
