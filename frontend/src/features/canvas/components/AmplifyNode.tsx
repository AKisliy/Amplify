"use client";

import React, { useState, useCallback, useEffect } from "react";
import { type NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Bot,
  ImageIcon,
  VideoIcon,
  Wrench,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Images,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasNode, CanvasNodeData, NodeCategory, NodeExecutionStatus, PortDef, ImageBatch } from "../types";
import { NodePort } from "./NodePort";
import { NodeWidget } from "./NodeWidget";
import { NodeImageGallery } from "./NodeImageGallery";

// ---------------------------------------------------------------------------
// Category accent colours (inline styles — dynamic at runtime)
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  text:    "#a855f7",
  image:   "#ec4899",
  video:   "#ef4444",
  utility: "#64748b",
};

const CATEGORY_ICONS: Record<NodeCategory, React.FC<{ className?: string }>> = {
  text:    ({ className }) => <Bot    className={className} />,
  image:   ({ className }) => <ImageIcon className={className} />,
  video:   ({ className }) => <VideoIcon className={className} />,
  utility: ({ className }) => <Wrench className={className} />,
};

// ---------------------------------------------------------------------------
// Status visual config
// ---------------------------------------------------------------------------

interface StatusConfig {
  icon: React.ReactNode;
  label: string;
  barClass: string;
  glow: string;
}

const STATUS_CONFIG: Record<NodeExecutionStatus, StatusConfig> = {
  idle: {
    icon: null,
    label: "idle",
    barClass: "bg-white/5",
    glow: "transparent",
  },
  queued: {
    icon: <Clock className="w-3 h-3" />,
    label: "queued",
    barClass: "bg-amber-500/40 animate-pulse",
    glow: "#f59e0b44",
  },
  processing: {
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    label: "processing",
    barClass: "bg-gradient-to-r from-blue-500/60 via-purple-500/60 to-blue-500/60 animate-shimmer",
    glow: "#6366f144",
  },
  success: {
    icon: <CheckCircle2 className="w-3 h-3" />,
    label: "success",
    barClass: "bg-green-500/50",
    glow: "#22c55e44",
  },
  error: {
    icon: <AlertCircle className="w-3 h-3" />,
    label: "error",
    barClass: "bg-red-500/60",
    glow: "#ef444444",
  },
};

// ---------------------------------------------------------------------------
// AmplifyNode component
// ---------------------------------------------------------------------------

export function AmplifyNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const updateNodeInternals = useUpdateNodeInternals();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Re-measure handle positions whenever the port list grows or shrinks
  useEffect(() => {
    updateNodeInternals(id);
  }, [data.ports.length, id, updateNodeInternals]);

  const accentColor = CATEGORY_COLORS[data.categoryTag] ?? "#64748b";
  const CategoryIcon = CATEGORY_ICONS[data.categoryTag];
  const statusCfg = STATUS_CONFIG[data.status ?? "idle"];

  // Derive output image history from node data
  const outputHistory = (data.outputHistory as ImageBatch[] | undefined) ?? [];
  const totalImages = outputHistory.reduce((sum, b) => sum + b.imageUuids.length, 0);

  // Callbacks injected by the canvas page into node.data
  const onUpdateConfig = data.onUpdateConfig as
    | ((field: string, value: unknown) => void)
    | undefined;
  const onDeleteNode = data.onDeleteNode as (() => void) | undefined;

  const handleValueChange = useCallback(
    (field: string, value: unknown) => {
      onUpdateConfig?.(field, value);
    },
    [onUpdateConfig]
  );

  // Partition ports into their rendering categories
  const inputHandles   = data.ports.filter(isInputHandle);
  const outputHandles  = data.ports.filter((p: PortDef) => p.direction === "output");
  const widgets        = data.ports.filter(isVisibleWidget);
  const advWidgets     = data.ports.filter(isAdvancedWidget);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        // Glassmorphic card
        "relative w-[300px] rounded-xl overflow-hidden",
        "bg-[oklch(0.13_0.03_264/0.90)] backdrop-blur-md",
        "border border-white/[0.07]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
        // Selection ring
        selected && "ring-2 ring-offset-0",
      )}
      style={
        selected
          ? { boxShadow: `0 0 0 2px ${accentColor}88, 0 8px 32px rgba(0,0,0,0.5)` }
          : undefined
      }
    >
      {/* ----------------------------------------------------------------- */}
      {/* Category accent stripe (top 3px) */}
      {/* ----------------------------------------------------------------- */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
        style={{ background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor}44)` }}
      />

      {/* Status glow overlay */}
      {data.status !== "idle" && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-500"
          style={{ boxShadow: `inset 0 0 40px ${statusCfg.glow}` }}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Header */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        {/* Category icon */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}44` }}
        >
          <span style={{ color: accentColor }}>
            <CategoryIcon className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Node name */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[12px] font-semibold leading-tight truncate text-white/90"
            title={data.displayName}
          >
            {data.displayName}
          </p>
          <p className="text-[9px] text-muted-foreground/40 truncate leading-tight mt-0.5">
            {data.schemaName}
          </p>
        </div>

        {/* Image counter badge — shown when there are stored images */}
        {outputHistory.length > 0 && (
          <div
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium shrink-0",
              "bg-[#ec4899]/15 text-[#ec4899]/80"
            )}
            title={`${totalImages} image${totalImages !== 1 ? "s" : ""} stored`}
          >
            <Images className="w-2.5 h-2.5" />
            <span>{totalImages}</span>
          </div>
        )}

        {/* Status badge */}
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium shrink-0 transition-all",
            data.status === "idle"       && "bg-white/5 text-white/30",
            data.status === "queued"     && "bg-amber-500/20 text-amber-400",
            data.status === "processing" && "bg-blue-500/20 text-blue-400",
            data.status === "success"    && "bg-green-500/20 text-green-400",
            data.status === "error"      && "bg-red-500/20 text-red-400",
          )}
        >
          {statusCfg.icon}
          <span>{statusCfg.label}</span>
        </div>

        {/* Delete button */}
        {onDeleteNode && (
          <button
            onClick={onDeleteNode}
            className={cn(
              "nodrag w-5 h-5 rounded flex items-center justify-center",
              "text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10",
              "transition-all duration-150 shrink-0"
            )}
            title="Delete node"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Divider */}
      {/* ----------------------------------------------------------------- */}
      <div className="mx-3 h-px bg-white/[0.05] mb-1" />

      {/* ----------------------------------------------------------------- */}
      {/* Widgets — inline controls (required, non-advanced) */}
      {/* ----------------------------------------------------------------- */}
      {widgets.length > 0 && (
        <div className="flex flex-col gap-0.5 py-1">
          {widgets.map((port: PortDef) => (
            <NodeWidget
              key={port.id}
              port={port}
              value={data.config[port.id]}
              onChange={(v) => handleValueChange(port.id, v)}
              disabled={data.status === "processing" || data.status === "queued"}
            />
          ))}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Ports row — input handles (left) + output handles (right) */}
      {/* ----------------------------------------------------------------- */}
      {(inputHandles.length > 0 || outputHandles.length > 0) && (
        <>
          {(widgets.length > 0 || advWidgets.length > 0) && (
            <div className="mx-3 h-px bg-white/[0.04] my-1" />
          )}
          <div className="flex justify-between py-1 gap-2">
            {/* Input handles */}
            <div className="flex flex-col">
              {inputHandles.map((port: PortDef) => (
                <NodePort key={port.id} port={port} nodeId={id} />
              ))}
            </div>
            {/* Output handles */}
            <div className="flex flex-col items-end">
              {outputHandles.map((port: PortDef) => (
                <NodePort key={port.id} port={port} nodeId={id} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Advanced section (collapsible) */}
      {/* ----------------------------------------------------------------- */}
      {advWidgets.length > 0 && (
        <>
          <div className="mx-3 h-px bg-white/[0.04] mt-1" />
          <button
            className={cn(
              "nodrag w-full flex items-center justify-between px-3 py-1.5",
              "text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70",
              "transition-colors"
            )}
            onClick={() => {
              setShowAdvanced((v) => !v);
              updateNodeInternals(id);
            }}
          >
            <span>Advanced</span>
            {showAdvanced ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-0.5 pb-1">
                  {advWidgets.map((port: PortDef) => (
                    <NodeWidget
                      key={port.id}
                      port={port}
                      value={data.config[port.id]}
                      onChange={(v) => handleValueChange(port.id, v)}
                      disabled={data.status === "processing" || data.status === "queued"}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Output image gallery — shown when the node has image history      */}
      {/* ----------------------------------------------------------------- */}
      {outputHistory.length > 0 && (
        <NodeImageGallery
          batches={outputHistory}
          nodeName={data.displayName}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Error message */}
      {/* ----------------------------------------------------------------- */}
      {data.status === "error" && data.errorMessage && (
        <div className="mx-3 mb-1 mt-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
          <p className="text-[10px] text-red-400 leading-snug">{data.errorMessage as string}</p>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Status footer bar */}
      {/* ----------------------------------------------------------------- */}
      <div className={cn("h-[3px] w-full mt-1 transition-all duration-500", statusCfg.barClass)} />
    </motion.div>
  );
}


// ---------------------------------------------------------------------------
// Port classification helpers
// ---------------------------------------------------------------------------

function isInputHandle(p: PortDef): boolean {
  return p.direction === "input" && !p.isWidget;
}

function isVisibleWidget(p: PortDef): boolean {
  if (p.direction !== "input" || !p.isWidget) return false;
  const cfg = p.config as Record<string, unknown>;
  return !cfg.advanced;
}

function isAdvancedWidget(p: PortDef): boolean {
  if (p.direction !== "input" || !p.isWidget) return false;
  const cfg = p.config as Record<string, unknown>;
  return cfg.advanced === true;
}
