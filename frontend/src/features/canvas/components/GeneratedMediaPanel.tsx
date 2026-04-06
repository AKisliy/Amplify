"use client";

// =============================================================================
// GeneratedMediaPanel — Sidebar panel for browsing all intermediate outputs
// =============================================================================

import React, {
  useMemo,
  useState,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Maximize2,
  ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import type { CanvasNode, ImageBatch } from "../types";
import { FullscreenGallery } from "./FullscreenGallery";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RunEntry {
  /** Node this batch came from */
  nodeId: string;
  nodeName: string;
  /** The batch itself */
  batch: ImageBatch;
  /** Monotonically increasing across all nodes — used for "global run" ordering */
  globalOrder: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GeneratedMediaPanelProps {
  isOpen: boolean;
  nodes: CanvasNode[];
}

// ---------------------------------------------------------------------------
// Thumbnail with load state
// ---------------------------------------------------------------------------

function Thumb({
  uuid,
  onClick,
}: {
  uuid: string;
  onClick: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const url = mediaUrl(uuid);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative aspect-square rounded-md overflow-hidden",
        "border border-white/[0.06] bg-white/[0.03]",
        "hover:border-[#ec4899]/50 hover:scale-[1.03]",
        "transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ec4899]"
      )}
    >
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-3 h-3 text-white/15 animate-spin" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <AlertCircle className="w-3 h-3 text-red-400/30" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className={cn(
          "w-full h-full object-cover transition-opacity duration-200",
          status === "loaded" ? "opacity-100" : "opacity-0 absolute"
        )}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-150 flex items-center justify-center">
        <Maximize2 className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Run batch card
// ---------------------------------------------------------------------------

function BatchCard({
  entry,
  onOpenGallery,
}: {
  entry: RunEntry;
  onOpenGallery: (allUuids: string[], startUuid: string) => void;
}) {
  const { batch, nodeName } = entry;
  const imageCount = batch.imageUuids.length;

  return (
    <div className="group">
      {/* Batch header row */}
      <div className="flex items-center gap-2 mb-1.5">
        {/* Node name badge */}
        <span
          className={cn(
            "text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
            "bg-[#ec4899]/12 text-[#ec4899]/70"
          )}
        >
          {nodeName}
        </span>
        <span className="text-[9px] text-white/20 font-mono shrink-0">
          Run {batch.runIndex + 1}
        </span>
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span className="text-[9px] text-white/20 shrink-0">
          {imageCount} img{imageCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 gap-1">
        {batch.imageUuids.map((uuid) => (
          <Thumb
            key={uuid}
            uuid={uuid}
            onClick={() => onOpenGallery(batch.imageUuids, uuid)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GeneratedMediaPanel({ isOpen, nodes }: GeneratedMediaPanelProps) {
  const [galleryOpen, setGalleryOpen]   = useState(false);
  const [galleryUuids, setGalleryUuids] = useState<string[]>([]);
  const [galleryStart, setGalleryStart] = useState<string | undefined>();
  const [galleryName, setGalleryName]   = useState("Generated images");

  // Collect all runs from all nodes — flattened and sorted by runIndex per node,
  // then interleaved in node order so newest is at the top.
  const runs = useMemo<RunEntry[]>(() => {
    const entries: RunEntry[] = [];
    let globalOrder = 0;

    for (const node of nodes) {
      const history = (node.data.outputHistory as ImageBatch[] | undefined) ?? [];
      for (const batch of history) {
        entries.push({
          nodeId:      node.id,
          nodeName:    node.data.displayName as string,
          batch,
          globalOrder: globalOrder++,
        });
      }
    }

    // Sort newest first: highest globalOrder = last added = top
    return entries.reverse();
  }, [nodes]);

  const totalImages = useMemo(
    () => runs.reduce((sum, e) => sum + e.batch.imageUuids.length, 0),
    [runs]
  );

  const openGallery = useCallback(
    (uuids: string[], startUuid: string, nodeName?: string) => {
      setGalleryUuids(uuids);
      setGalleryStart(startUuid);
      setGalleryName(nodeName ?? "Generated images");
      setGalleryOpen(true);
    },
    []
  );

  // All images flat list for the "view all" fullscreen mode
  const allUuids = useMemo(
    () => runs.flatMap((e) => e.batch.imageUuids),
    [runs]
  );

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Side panel */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="generated-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "h-full shrink-0 flex flex-col overflow-hidden",
              "border-r border-white/[0.06]",
              "bg-[oklch(0.10_0.02_264/0.95)] backdrop-blur-xl"
            )}
          >
            {/* Panel header */}
            <div className="flex items-center gap-2 px-3 py-3 border-b border-white/[0.05] shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#ec4899]/70 shrink-0" />
              <span className="text-[11px] font-semibold text-white/70 flex-1">
                Generated Media
              </span>
              {totalImages > 0 && (
                <span className="text-[9px] font-mono text-white/25">
                  {totalImages}
                </span>
              )}
            </div>

            {/* Content */}
            {runs.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {/* "View all" button */}
                {totalImages > 1 && (
                  <div className="px-3 pt-2.5 shrink-0">
                    <button
                      onClick={() => openGallery(allUuids, allUuids[0], "All generated media")}
                      className={cn(
                        "w-full text-[9px] font-medium py-1.5 rounded-md",
                        "border border-white/[0.07] bg-white/[0.03]",
                        "text-white/40 hover:text-[#ec4899]/80 hover:border-[#ec4899]/30 hover:bg-[#ec4899]/5",
                        "transition-all duration-150"
                      )}
                    >
                      View all {totalImages} images ↗
                    </button>
                  </div>
                )}

                {/* Scrollable run list */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2.5 space-y-4 min-h-0">
                  {runs.map((entry) => (
                    <BatchCard
                      key={`${entry.nodeId}-${entry.batch.runIndex}`}
                      entry={entry}
                      onOpenGallery={(uuids, uuid) =>
                        openGallery(uuids, uuid, entry.nodeName)
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Fullscreen gallery portal */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {galleryOpen && (
          <FullscreenGallery
            nodeName={galleryName}
            batches={[{ runIndex: 0, imageUuids: galleryUuids }]}
            allImageUuids={galleryUuids}
            initialUuid={galleryStart}
            onClose={() => setGalleryOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          "bg-white/[0.04] border border-white/[0.06]"
        )}
      >
        <ImageOff className="w-4 h-4 text-white/15" />
      </div>
      <div className="text-center">
        <p className="text-[11px] font-medium text-white/30">No outputs yet</p>
        <p className="text-[9px] text-white/15 leading-relaxed mt-0.5">
          Run a node that produces images<br />— they appear here automatically.
        </p>
      </div>
    </div>
  );
}
