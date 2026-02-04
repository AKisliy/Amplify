"use client";

import { cn } from "@/lib/utils";
import { DAYS_OF_WEEK, maskToDays, daysToMask } from "../types";

interface DaySelectorProps {
  value: number; // Bitmask value
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function DaySelector({ value, onChange, disabled }: DaySelectorProps) {
  const selectedDays = maskToDays(value);

  const toggleDay = (dayValue: number) => {
    if (disabled) return;
    
    const isSelected = selectedDays.includes(dayValue);
    let newSelectedDays: number[];
    
    if (isSelected) {
      newSelectedDays = selectedDays.filter((d) => d !== dayValue);
    } else {
      newSelectedDays = [...selectedDays, dayValue];
    }
    
    onChange(daysToMask(newSelectedDays));
  };

  return (
    <div className="flex items-center gap-1.5">
      {DAYS_OF_WEEK.map((day) => {
        const isSelected = selectedDays.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            onClick={() => toggleDay(day.value)}
            disabled={disabled}
            title={day.fullName}
            className={cn(
              "w-9 h-9 rounded-full text-sm font-medium transition-all duration-200",
              "border border-border/60 hover:border-primary/50",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground hover:bg-muted/50"
            )}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
