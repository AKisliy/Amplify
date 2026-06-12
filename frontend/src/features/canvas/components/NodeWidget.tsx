"use client";

// =============================================================================
// NodeWidget — Inline control rendered inside a node for non-handle inputs.
// Handles STRING (textarea/input), INT/FLOAT (number), BOOLEAN (switch), COMBO (select).
// =============================================================================

import { Handle, Position } from "@xyflow/react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PORT_COLORS } from "../lib/colors";
import type {
  PortDef,
  StringInputConfig,
  ComboInputConfig,
  IntInputConfig,
  BooleanInputConfig,
} from "../types";

// ---------------------------------------------------------------------------

interface NodeWidgetProps {
  port: PortDef;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  /** True when a socket edge is connected to this port — socket value takes priority */
  isConnected?: boolean;
}

export function NodeWidget({ port, value, onChange, disabled, isConnected }: NodeWidgetProps) {
  const label = port.label;

  switch (port.portType) {
    case "STRING": {
      const cfg = port.config as StringInputConfig;

      if (cfg.multiline !== false && (cfg.multiline || port.required === "optional")) {
        // Multiline → textarea, optionally with a connectable socket handle
        const socketHandle = port.canConnectSocket ? (
          <Handle
            id={port.id}
            type="target"
            position={Position.Left}
            style={{
              position: "relative",
              inset: "unset",
              transform: "none",
              width: 11,
              height: 11,
              minWidth: 11,
              minHeight: 11,
              borderRadius: "50%",
              background: PORT_COLORS["STRING"],
              border: `2px solid ${PORT_COLORS["STRING"]}40`,
              boxShadow: `0 0 0 1px ${PORT_COLORS["STRING"]}20, 0 0 8px ${PORT_COLORS["STRING"]}44`,
              flexShrink: 0,
              cursor: "crosshair",
            }}
          />
        ) : null;

        return (
          <WidgetRow label={label} tooltip={port.tooltip} socketHandle={socketHandle} isConnected={isConnected}>
            <Textarea
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              className={cn(
                "nodrag nopan nowheel resize-none text-[11px] min-h-[52px] max-h-[160px] overflow-y-auto",
                "bg-black/20 border-white/[0.06] placeholder:text-muted-foreground/30",
                "focus-visible:ring-1 focus-visible:ring-white/20",
                isConnected && "opacity-30 pointer-events-none",
              )}
              placeholder={isConnected ? "← value from socket" : (cfg.tooltip ?? `Enter ${label}…`)}
              disabled={disabled || isConnected}
            />
          </WidgetRow>
        );
      }
      // Single line → input
      return (
        <WidgetRow label={label} tooltip={port.tooltip}>
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "nodrag nopan nowheel text-[11px] h-7",
              "bg-black/20 border-white/[0.06] placeholder:text-muted-foreground/30",
              "focus-visible:ring-1 focus-visible:ring-white/20"
            )}
            placeholder={cfg.tooltip ?? `Enter ${label}…`}
            disabled={disabled}
          />
        </WidgetRow>
      );
    }

    case "COMBO": {
      const cfg = port.config as ComboInputConfig;
      // Use || instead of ?? so that empty string also falls back to default.
      // Radix UI Select uses value internally as a key — an empty string ("")
      // causes the "duplicate key" React warning.
      const rawVal = value as string | undefined;
      const currentValue = rawVal || cfg.default || cfg.options[0] || " ";
      return (
        <WidgetRow label={label} tooltip={port.tooltip}>
          <Select
            value={currentValue}
            onValueChange={(v) => onChange(v)}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn(
                "nodrag nopan nowheel text-[11px] h-7",
                "bg-black/20 border-white/[0.06]",
                "focus:ring-1 focus:ring-white/20"
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cfg.options.map((opt, i) => (
                <SelectItem key={`${i}-${opt}`} value={opt || ` `} className="text-xs">
                  {opt || "(empty)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </WidgetRow>
      );
    }

    case "INT":
    case "FLOAT": {
      const cfg = port.config as IntInputConfig;
      const numVal = (value as number) ?? cfg.default ?? 0;
      const color = PORT_COLORS[port.portType as "INT" | "FLOAT"];
      const socketHandle = port.canConnectSocket ? (
        <Handle
          id={port.id}
          type="target"
          position={Position.Left}
          style={{
            position: "relative",
            inset: "unset",
            transform: "none",
            width: 11,
            height: 11,
            minWidth: 11,
            minHeight: 11,
            borderRadius: "50%",
            background: color,
            border: `2px solid ${color}40`,
            boxShadow: `0 0 0 1px ${color}20, 0 0 8px ${color}44`,
            flexShrink: 0,
            cursor: "crosshair",
          }}
        />
      ) : null;
      return (
        <WidgetRow label={label} tooltip={port.tooltip} inline socketHandle={socketHandle} isConnected={isConnected}>
          <Input
            type="number"
            value={numVal}
            onChange={(e) => onChange(Number(e.target.value))}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step ?? (port.portType === "FLOAT" ? 0.01 : 1)}
            className={cn(
              "nodrag nopan nowheel text-[11px] h-7 w-24 text-right",
              "bg-black/20 border-white/[0.06]",
              "focus-visible:ring-1 focus-visible:ring-white/20",
              isConnected && "opacity-30 pointer-events-none",
            )}
            disabled={disabled || isConnected}
          />
        </WidgetRow>
      );
    }

    case "BOOLEAN": {
      const cfg = port.config as BooleanInputConfig;
      return (
        <div className="flex items-center justify-between px-3 py-[5px]">
          <label
            className="text-[11px] text-muted-foreground/70 select-none"
            title={port.tooltip}
          >
            {label}
          </label>
          <Switch
            checked={(value as boolean) ?? cfg.default ?? false}
            onCheckedChange={(v) => onChange(v)}
            className="nodrag scale-75"
            disabled={disabled}
          />
        </div>
      );
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// WidgetRow — shared label + control layout wrapper
// ---------------------------------------------------------------------------

interface WidgetRowProps {
  label: string;
  tooltip?: string;
  inline?: boolean;
  /** Optional inline socket handle rendered to the left of the label */
  socketHandle?: React.ReactNode;
  /** When true, shows a subtle "socket" indicator next to the label */
  isConnected?: boolean;
  children: React.ReactNode;
}

function WidgetRow({ label, tooltip, inline = false, socketHandle, isConnected, children }: WidgetRowProps) {
  if (inline) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-[3px]">
        <div className="flex items-center gap-1.5 shrink-0">
          {socketHandle}
          <label
            className="text-[11px] text-muted-foreground/70 select-none"
            title={tooltip}
          >
            {label}
          </label>
          {isConnected && (
            <span className="text-[9px] text-purple-400/70 leading-none">socket</span>
          )}
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[3px] px-3 py-[3px]">
      <div className="flex items-center gap-1.5">
        {socketHandle}
        <label
          className="text-[11px] text-muted-foreground/60 select-none"
          title={tooltip}
        >
          {label}
        </label>
        {isConnected && (
          <span className="text-[9px] text-purple-400/70 leading-none">socket</span>
        )}
      </div>
      {children}
    </div>
  );
}
