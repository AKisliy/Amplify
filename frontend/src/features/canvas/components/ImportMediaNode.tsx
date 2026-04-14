"use client";

// =============================================================================
// ImportMediaNode — Input node for attaching media from the library.
//
// Shows a gallery of all previously imported images (using NodeImageGallery)
// or a single video preview. Each time a user attaches a new image, it is
// appended to outputHistory so the full import history is browseable.
// =============================================================================

import React from "react";
import { type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  ImageIcon,
  VideoIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasNode, ImageBatch } from "../types";
import { NodePort } from "./NodePort";
import { NodeImageGallery } from "./NodeImageGallery";
import { AmplifyVideo } from "@/features/media/components/AmplifyVideo";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportMediaNode({ id, data, selected }: NodeProps<CanvasNode>) {
  // MediaInputNode uses media_uuid + media_type + media_preview_url
  const mediaType = (data.config?.media_type as "image" | "video" | undefined);
  const mediaPreviewUrl = (data.config?.media_preview_url as string | undefined) || "";

  // ImportMediaNode uses separate image_uuid / video_uuid
  const imageUuid = mediaType === "image" && mediaPreviewUrl ? mediaPreviewUrl
    : (data.config?.image_uuid as string | undefined) || "";
  const videoUuid = mediaType === "video" && mediaPreviewUrl ? mediaPreviewUrl
    : (data.config?.video_uuid as string | undefined) || "";

  const hasImage = imageUuid && imageUuid.trim() !== "";
  const hasVideo = videoUuid && videoUuid.trim() !== "";

  // Image gallery history — persisted in outputHistory.
  // If outputHistory exists use it; otherwise synthesise a single batch from
  // the current config value so existing saved nodes still show something.
  const storedHistory = (data.outputHistory as ImageBatch[] | undefined) ?? [];
  const outputHistory: ImageBatch[] =
    storedHistory.length > 0
      ? storedHistory
      : hasImage
        ? [{ runIndex: 0, imageUuids: [imageUuid] }]
        : [];

  const variant = hasImage ? "image" : hasVideo ? "video" : null;

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
          ? { boxShadow: "0 0 0 2px #3b82f688, 0 8px 32px rgba(0,0,0,0.5)" }
          : undefined
      }
    >
      {/* Accent stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
        style={{ background: "linear-gradient(90deg, #3b82f6cc, #3b82f644)" }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "#3b82f622", border: "1px solid #3b82f644" }}
        >
          <span style={{ color: "#3b82f6" }}>
            {hasImage ? (
              <ImageIcon className="w-3.5 h-3.5" />
            ) : hasVideo ? (
              <VideoIcon className="w-3.5 h-3.5" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 opacity-40" />
            )}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold leading-tight truncate text-white/90">
            {data.displayName}
          </p>
          <p className="text-[9px] text-muted-foreground/40 leading-tight mt-0.5">
            media input
          </p>
        </div>
      </div>

      <div className="mx-3 h-px bg-white/[0.05] mb-1" />

      {/* Preview area */}
      {variant === "image" ? (
        <NodeImageGallery batches={outputHistory} nodeName={data.displayName} />
      ) : variant === "video" ? (
        <div className="mx-3 mb-3">
          <VideoPreview uuid={videoUuid} />
        </div>
      ) : (
        <div className="mx-3 mb-3">
          <EmptyMediaPreview />
        </div>
      )}

      {/* Output handles row */}
      <div className="py-1">
        {data.ports
          .filter((p) => p.direction === "output")
          .map((port) => (
            <NodePort key={port.id} port={port} nodeId={id} />
          ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------------------

function EmptyMediaPreview() {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg py-6 mb-2",
        "border border-dashed border-white/[0.08]"
      )}
    >
      <span style={{ color: "#3b82f655" }}>
        <ImageIcon className="w-7 h-7" />
      </span>
      <p className="text-[10px] text-muted-foreground/30 text-center leading-snug">
        Select a media asset<br />
        from the sidebar
      </p>
    </div>
  );
}

function VideoPreview({ uuid }: { uuid: string }) {
  // Accept either a bare UUID (resolved via media-ingest proxy) or a full URL
  const isUuid = !uuid.startsWith("http://") && !uuid.startsWith("https://");

  return (
    <div className="rounded-lg overflow-hidden bg-black/25 border border-white/[0.06] aspect-video mb-2">
      <AmplifyVideo
        {...(isUuid ? { mediaId: uuid } : { src: uuid })}
        mode="controls"
        className="nodrag"
      />
    </div>
  );
}
