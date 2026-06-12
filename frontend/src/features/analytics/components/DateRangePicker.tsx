"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DateRange } from "../hooks/useAnalytics";

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const handlePreset = (days: number) => {
    onChange({ from: subDays(new Date(), days - 1), to: new Date() });
  };

  const label = `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 font-normal">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          {label}
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="flex flex-col gap-1 p-3 border-r border-border w-36">
            <p className="text-xs text-muted-foreground font-medium px-2 pb-1">Presets</p>
            {PRESETS.map((p) => (
              <Button
                key={p.days}
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start text-sm font-normal",
                  value.from.getTime() === subDays(new Date(), p.days - 1).setHours(0, 0, 0, 0) && "bg-muted"
                )}
                onClick={() => { handlePreset(p.days); setOpen(false); }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={{ from: value.from, to: value.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onChange({ from: range.from, to: range.to });
                  setOpen(false);
                }
              }}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
