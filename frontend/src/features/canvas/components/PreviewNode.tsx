"use client";

// =============================================================================
// PreviewNode — Output-sink node for visualising text / image / video results.
//
// After a workflow completes, the canvas store propagates upstream outputValues
// into downstream nodes' config and outputHistory.  PreviewNode renders:
//   • PreviewTextNode  → scrollable text area
//   • PreviewImageNode → NodeImageGallery (multi-image with Single/Batch/All)
//   • PreviewVideoNode → <video> fetched from media-ingest
// =============================================================================

import React, { useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  FileText,
  ImageIcon,
  VideoIcon,
  Loader2,
  AlertCircle,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AmplifyVideo } from "@/features/media/components/AmplifyVideo";
import type { CanvasNode, ImageBatch } from "../types";
import { NodePort } from "./NodePort";
import { NodeImageGallery } from "./NodeImageGallery";

// ---------------------------------------------------------------------------
// Media URL helper (mirrors mediaApi.getMediaUrl)
// ---------------------------------------------------------------------------

function getMediaUrl(uuidOrUrl: string): string {
  if (uuidOrUrl.startsWith("http://") || uuidOrUrl.startsWith("https://")) return uuidOrUrl;
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech";
  return `${base}/media/api/media/${uuidOrUrl}`;
}

// ---------------------------------------------------------------------------
// Per-schema config
// ---------------------------------------------------------------------------

type PreviewVariant = "text" | "image" | "video";

function resolveVariant(schemaName: string): PreviewVariant {
  if (schemaName === "PreviewImageNode") return "image";
  if (schemaName === "PreviewVideoNode") return "video";
  return "text";
}

const VARIANT_COLORS: Record<PreviewVariant, string> = {
  text:  "#a855f7",
  image: "#ec4899",
  video: "#ef4444",
};

const VARIANT_ICONS: Record<PreviewVariant, React.FC<{ className?: string }>> = {
  text:  ({ className }) => <FileText  className={className} />,
  image: ({ className }) => <ImageIcon className={className} />,
  video: ({ className }) => <VideoIcon className={className} />,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PreviewNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const variant = resolveVariant(data.schemaName);
  const accentColor = VARIANT_COLORS[variant];
  const Icon = VARIANT_ICONS[variant];

  // Image gallery — populated by propagateOutputsDownstream via outputHistory
  const outputHistory = (data.outputHistory as ImageBatch[] | undefined) ?? [];
  const hasImageHistory = variant === "image" && outputHistory.length > 0;

  // Text / video — still read from config directly
  const inputPort = data.ports.find((p) => p.direction === "input");
  const rawValue = inputPort ? (data.config[inputPort.id] as string | undefined) : undefined;
  const hasValue = rawValue !== undefined && rawValue !== "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative w-[280px] rounded-xl overflow-hidden",
        "bg-[oklch(0.13_0.03_264/0.90)] backdrop-blur-md",
        "border border-white/[0.07]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
        selected && "ring-2 ring-offset-0"
      )}
      style={
        selected
          ? { boxShadow: `0 0 0 2px ${accentColor}88, 0 8px 32px rgba(0,0,0,0.5)` }
          : undefined
      }
    >
      {/* Accent stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
        style={{ background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor}44)` }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}44` }}
        >
          <span style={{ color: accentColor }}>
            <Icon className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold leading-tight truncate text-white/90">
            {data.displayName}
          </p>
          <p className="text-[9px] text-muted-foreground/40 leading-tight mt-0.5">
            output sink
          </p>
        </div>
      </div>

      <div className="mx-3 h-px bg-white/[0.05] mb-1" />

      {/* Input handle row */}
      <div className="py-1">
        {data.ports
          .filter((p) => p.direction === "input")
          .map((port) => (
            <NodePort key={port.id} port={port} nodeId={id} />
          ))}
      </div>

      {/* Preview area */}
      {variant === "image" ? (
        hasImageHistory ? (
          <NodeImageGallery batches={outputHistory} nodeName={data.displayName} />
        ) : (
          <div className="mx-3 mb-3 mt-1">
            <EmptyPreview variant={variant} accentColor={accentColor} />
          </div>
        )
      ) : (
        <div className="mx-3 mb-3 mt-1">
          {!hasValue ? (
            <EmptyPreview variant={variant} accentColor={accentColor} />
          ) : variant === "text" ? (
            <TextPreview value={rawValue!} />
          ) : (
            <VideoPreview uuid={rawValue!} />
          )}
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------------------

function EmptyPreview({
  variant,
  accentColor,
}: {
  variant: PreviewVariant;
  accentColor: string;
}) {
  const Icon = VARIANT_ICONS[variant];
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg py-6",
        "border border-dashed border-white/[0.08]"
      )}
    >
      <span style={{ color: `${accentColor}55` }}>
        <Icon className="w-7 h-7" />
      </span>
      <p className="text-[10px] text-muted-foreground/30 text-center leading-snug">
        Connect an output
        <br />
        to preview here
      </p>
    </div>
  );
}

function TextPreview({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > 300;
  const display = !expanded && isLong ? value.slice(0, 300) + "…" : value;

  return (
    <div className="rounded-lg bg-black/25 border border-white/[0.06] overflow-hidden">
      <p className="px-2.5 py-2 text-[11px] text-white/80 leading-relaxed whitespace-pre-wrap break-words">
        {display}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="nodrag w-full flex items-center justify-center gap-1 py-1 border-t border-white/[0.05] text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
        >
          <Maximize2 className="w-3 h-3" />
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function VideoPreview({ uuid }: { uuid: string }) {
  // Accept either a bare UUID (resolved via media-ingest proxy) or a full URL
  const isUuid = !uuid.startsWith("http://") && !uuid.startsWith("https://");

  return (
    <div className="relative rounded-lg overflow-hidden bg-black/25 border border-white/[0.06] aspect-video">
      <AmplifyVideo
        {...(isUuid ? { mediaId: uuid } : { src: uuid })}
        mode="controls"
        className="nodrag"
      />
    </div>
  );
}
