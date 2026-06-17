"use client";

import { differenceInDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DateRange } from "../hooks/useAnalytics";

const PRESETS = [
  { label: "Last 7 days",  days: 7  },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const activeDays = differenceInDays(value.to, value.from) + 1;

  return (
    <div className="flex items-center rounded-lg border border-border overflow-hidden">
      {PRESETS.map((p) => (
        <Button
          key={p.days}
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-none border-0 px-4 text-sm font-normal",
            activeDays === p.days
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange({ from: subDays(new Date(), p.days - 1), to: new Date() })}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
