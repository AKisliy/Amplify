"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  size?: "sm" | "default"
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, size = "default", ...props }, ref) => {
    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked)
    }

    return (
      <div className="inline-flex items-center">
        <label className="relative inline-flex items-center cursor-pointer group">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={handleToggle}
            ref={ref}
            {...props}
          />
          <div
            className={cn(
              "peer transition-all rounded-full border border-transparent shadow-sm outline-none bg-input peer-checked:bg-primary",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              size === "default" ? "h-[1.15rem] w-8" : "h-3.5 w-6",
              className
            )}
          >
            <div
              className={cn(
                "bg-background rounded-full transition-transform shadow-sm pointer-events-none",
                size === "default" ? "size-4 mt-[0.5px] ml-[0.5px]" : "size-3 mt-[0.25px] ml-[0.25px]",
                checked
                  ? (size === "default" ? "translate-x-[calc(100%-4px)]" : "translate-x-[calc(100%-4px)]")
                  : "translate-x-0"
              )}
            />
          </div>
        </label>
      </div>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
