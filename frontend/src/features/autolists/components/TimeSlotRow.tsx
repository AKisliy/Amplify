"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DaySelector } from "./DaySelector";
import type { AutoListEntry } from "../types";

interface TimeSlotRowProps {
  entry: AutoListEntry;
  onUpdate: (id: string, data: Partial<AutoListEntry>) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

// Generate hour options (1-12)
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
// Generate minute options (00-55 in 5-minute increments)
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export function TimeSlotRow({
  entry,
  onUpdate,
  onDelete,
  disabled,
}: TimeSlotRowProps) {
  // Parse time string (HH:mm:ss) into components
  const parseTime = (timeStr: string) => {
    const [hoursStr, minutes] = timeStr.split(":");
    let hours = parseInt(hoursStr, 10);
    const period = hours >= 12 ? "PM" : "AM";
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    return {
      hour: String(hours).padStart(2, "0"),
      minute: minutes,
      period,
    };
  };

  // Convert components back to time string
  const formatTime = (hour: string, minute: string, period: string) => {
    let hours = parseInt(hour, 10);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minute}:00`;
  };

  const time = parseTime(entry.publicationTime);

  const handleTimeChange = (
    field: "hour" | "minute" | "period",
    value: string
  ) => {
    const newTime = { ...time, [field]: value };
    const timeStr = formatTime(newTime.hour, newTime.minute, newTime.period);
    onUpdate(entry.id, { publicationTime: timeStr });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/40 transition-all hover:border-border/60">
      {/* Time selectors */}
      <div className="flex items-center gap-1.5">
        <Select
          value={time.hour}
          onValueChange={(v) => handleTimeChange("hour", v)}
          disabled={disabled}
        >
          <SelectTrigger className="w-16 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span className="text-muted-foreground font-medium">:</span>
        
        <Select
          value={time.minute}
          onValueChange={(v) => handleTimeChange("minute", v)}
          disabled={disabled}
        >
          <SelectTrigger className="w-16 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* AM/PM Toggle */}
        <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
          <button
            type="button"
            onClick={() => handleTimeChange("period", "AM")}
            disabled={disabled}
            className={`px-2.5 py-1.5 text-xs font-semibold transition-all ${
              time.period === "AM"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted/50"
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handleTimeChange("period", "PM")}
            disabled={disabled}
            className={`px-2.5 py-1.5 text-xs font-semibold transition-all ${
              time.period === "PM"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted/50"
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex-1 min-w-[280px]">
        <DaySelector
          value={entry.dayOfWeeks}
          onChange={(bitmask) => onUpdate(entry.id, { dayOfWeeks: bitmask })}
          disabled={disabled}
        />
      </div>

      {/* Delete button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(entry.id)}
        disabled={disabled}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
