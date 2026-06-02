"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import {
  getSpendSummary,
  getSpendTrend,
  getSpendByModel,
  getSpendByTemplate,
  getSpendByJob,
} from "@/lib/api/userservice";
import type {
  SpendSummaryDto,
  SpendTrendPointDto,
  ModelSpendDto,
  TemplateSpendDto,
  JobSpendDto,
} from "@/lib/api/generated/userservice/types.gen";

export type DateRange = { from: Date; to: Date };

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function useDefaultRange(): DateRange {
  return { from: subDays(new Date(), 29), to: new Date() };
}

export function useSpendSummary(projectId: string, range: DateRange) {
  const [data, setData] = useState<SpendSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getSpendSummary({ path: { projectId }, query: { from: fmt(range.from), to: fmt(range.to) } })
      .then((r) => setData(r.data ?? null))
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [projectId, range.from, range.to]);

  return { data, isLoading };
}

export function useSpendTrend(projectId: string, range: DateRange) {
  const [data, setData] = useState<SpendTrendPointDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getSpendTrend({ path: { projectId }, query: { from: fmt(range.from), to: fmt(range.to) } })
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [projectId, range.from, range.to]);

  return { data, isLoading };
}

export function useSpendByModel(projectId: string, range: DateRange) {
  const [data, setData] = useState<ModelSpendDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getSpendByModel({ path: { projectId }, query: { from: fmt(range.from), to: fmt(range.to) } })
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [projectId, range.from, range.to]);

  return { data, isLoading };
}

export function useSpendByTemplate(projectId: string, range: DateRange) {
  const [data, setData] = useState<TemplateSpendDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getSpendByTemplate({ path: { projectId }, query: { from: fmt(range.from), to: fmt(range.to) } })
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [projectId, range.from, range.to]);

  return { data, isLoading };
}

export function useSpendByJob(projectId: string, range: DateRange) {
  const [data, setData] = useState<JobSpendDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getSpendByJob({ path: { projectId }, query: { from: fmt(range.from), to: fmt(range.to) } })
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [projectId, range.from, range.to]);

  return { data, isLoading };
}
