"use client";

// =============================================================================
// NodePort — A styled ReactFlow Handle for the AmplifyNode component.
// Each port is colour-coded by its data type and shows a label + optional badge.
// =============================================================================

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { PortDef, NodePortType, NodeInputPrimitive } from "../types";

// ---------------------------------------------------------------------------
// Port colour palette (one accent per data type)
// ---------------------------------------------------------------------------

export const PORT_COLORS: Record<NodePortType | NodeInputPrimitive, string> = {
  STRING:              "#a855f7", // purple-500
  INT:                 "#22c55e", // green-500
  FLOAT:               "#06b6d4", // cyan-500
  BOOLEAN:             "#eab308", // yellow-500
  COMBO:               "#f97316", // orange-500
  IMAGE:               "#ec4899", // pink-500
  VIDEO:               "#ef4444", // red-500
  COMFY_AUTOGROW_V3:   "#3b82f6", // blue-500
};

function portColor(type: string): string {
  return PORT_COLORS[type as NodePortType] ?? "#94a3b8";
}

// ---------------------------------------------------------------------------
// NodePort
// ---------------------------------------------------------------------------

interface NodePortProps {
  port: PortDef;
  /** Must match the node's `id` so React Flow can wire edges correctly */
  nodeId: string;
}

export function NodePort({ port }: NodePortProps) {
  const color = portColor(port.portType);
  const isInput = port.direction === "input";
  const isOptional = port.required === "optional";

  return (
    <div
      title={port.tooltip ?? port.label}
      className={cn(
        "group relative flex items-center gap-2 py-[3px] min-h-[26px] select-none",
        isInput ? "flex-row pl-2" : "flex-row-reverse pr-2"
      )}
    >
      {/* The actual ReactFlow handle */}
      <Handle
        id={port.id}
        type={isInput ? "target" : "source"}
        position={isInput ? Position.Left : Position.Right}
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
          transition: "box-shadow 0.15s ease, transform 0.1s ease",
          cursor: "crosshair",
        }}
        className="!hover:scale-125"
      />

      {/* Label */}
      <span
        className={cn(
          "text-[11px] leading-none font-medium truncate max-w-[110px]",
          isOptional
            ? "text-muted-foreground/60"
            : "text-muted-foreground/90"
        )}
        style={{ color: `${color}bb` }}
      >
        {port.label}
        {isOptional && (
          <span className="ml-1 text-[9px] text-muted-foreground/40">opt</span>
        )}
      </span>
    </div>
  );
}
