"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import {
  getGlobalSpendSummary,
  getGlobalSpendTrend,
  getGlobalOutputVolume,
  getGlobalCapitalBurn,
  getEntityEfficiency,
} from "@/lib/api/userservice";
import type {
  SpendSummaryDto,
  SpendTrendPointDto,
  OutputVolumeDto,
  CapitalBurnPointDto,
  EntityEfficiencyDto,
} from "@/lib/api/generated/userservice/types.gen";
import type { DateRange } from "./useAnalytics";

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function useGlobalSpendSummary(range: DateRange) {
  const [data, setData] = useState<SpendSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getGlobalSpendSummary({ query: { from: fmt(range.from), to: fmt(range.to) } })
      .then((r) => setData(r.data ?? null))
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [range.from, range.to]);

  return { data, isLoading };
}

export function useGlobalSpendTrend(range: DateRange) {
  const [data, setData] = useState<SpendTrendPointDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getGlobalSpendTrend({ query: { from: fmt(range.from), to: fmt(range.to) } })
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [range.from, range.to]);

  return { data, isLoading };
}

export function useGlobalOutputVolume(range: DateRange) {
  const [data, setData] = useState<OutputVolumeDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getGlobalOutputVolume({ query: { from: fmt(range.from), to: fmt(range.to) } })
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [range.from, range.to]);

  return { data, isLoading };
}

export function useGlobalCapitalBurn(range: DateRange) {
  const [data, setData] = useState<CapitalBurnPointDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getGlobalCapitalBurn({ query: { from: fmt(range.from), to: fmt(range.to) } })
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [range.from, range.to]);

  return { data, isLoading };
}

export function useEntityEfficiency(range: DateRange) {
  const [data, setData] = useState<EntityEfficiencyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getEntityEfficiency({ query: { from: fmt(range.from), to: fmt(range.to) } })
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [range.from, range.to]);

  return { data, isLoading };
}

export function useDefaultGlobalRange(): DateRange {
  return { from: subDays(new Date(), 29), to: new Date() };
}
