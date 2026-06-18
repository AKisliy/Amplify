"use client";

import React from "react";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { Zap, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Node } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Cache Zone node type
// ---------------------------------------------------------------------------

export interface CacheZoneData extends Record<string, unknown> {
  onDeleteNode?: unknown;
}

export type CacheZoneNodeType = Node<CacheZoneData, "cache-zone">;

export function CacheZoneNode({ selected, data }: NodeProps<CacheZoneNodeType>) {
  const onDeleteNode = data.onDeleteNode as (() => void) | undefined;

  return (
    <>
      <NodeResizer
        minWidth={160}
        minHeight={100}
        isVisible={selected}
        lineClassName="!border-cyan-500/60"
        handleClassName="!bg-cyan-500/80 !border-cyan-400 !w-2 !h-2 !rounded-sm"
      />

      {/* Zone body */}
      <div
        className={cn(
          "w-full h-full rounded-xl pointer-events-none",
          "bg-cyan-500/5 border border-dashed border-cyan-500/40",
          selected && "border-cyan-500/70 bg-cyan-500/8",
        )}
      />

      {/* Label — top-left, pointer-events enabled */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-auto">
        <Zap className="w-3 h-3 text-cyan-400/70" />
        <span className="text-[10px] font-medium text-cyan-400/70 select-none">
          Cache Zone
        </span>
      </div>

      {/* Delete button — top-right, only when selected */}
      {selected && onDeleteNode && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDeleteNode}
          className="nodrag absolute top-1.5 right-1.5 pointer-events-auto text-cyan-400/40 hover:text-red-400 hover:bg-red-500/10"
          title="Delete cache zone"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </>
  );
}
