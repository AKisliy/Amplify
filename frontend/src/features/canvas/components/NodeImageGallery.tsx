"use client";

// =============================================================================
// NodeImageGallery — Inline image gallery for AmplifyNode.
// =============================================================================

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Layers,
  LayoutGrid,
  Square,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import type { ImageBatch, ImageViewMode } from "../types";
import { FullscreenGallery } from "./FullscreenGallery";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NodeImageGalleryProps {
  /** All batches for this node, oldest first */
  batches: ImageBatch[];
  /** Node display name (forwarded to fullscreen gallery) */
  nodeName: string;
}

// ---------------------------------------------------------------------------
// Single image card with load state
// ---------------------------------------------------------------------------

function ImageCard({
  uuid,
  onClick,
  className,
}: {
  uuid: string;
  onClick?: (uuid: string) => void;
  className?: string;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const url = mediaUrl(uuid);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(uuid)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(uuid); }}
      className={cn(
        "relative overflow-hidden rounded-md bg-black/30",
        "border border-white/[0.06]",
        onClick && "cursor-pointer hover:border-[#ec4899]/40 transition-colors duration-150",
        className
      )}
    >
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <AlertCircle className="w-4 h-4 text-red-400/40" />
          <span className="text-[9px] text-red-400/40">Error</span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className={cn(
          "nodrag nopan nowheel w-full h-full object-cover transition-opacity duration-300",
          status === "loaded" ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// View mode toggle button group
// ---------------------------------------------------------------------------

const MODES: { mode: ImageViewMode; icon: React.ReactNode; title: string }[] = [
  { mode: "single", icon: <Square className="w-3 h-3" />, title: "Single" },
  { mode: "batch", icon: <Layers className="w-3 h-3" />, title: "Batch" },
  { mode: "all", icon: <LayoutGrid className="w-3 h-3" />, title: "All" },
];

function ModeToggle({
  current,
  onChange,
}: {
  current: ImageViewMode;
  onChange: (m: ImageViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 bg-white/[0.05] rounded-md p-0.5">
      {MODES.map(({ mode, icon, title }) => (
        <button
          key={mode}
          title={title}
          onClick={() => onChange(mode)}
          className={cn(
            "nodrag px-1.5 py-0.5 rounded flex items-center gap-1",
            "text-[9px] font-medium transition-all duration-150",
            current === mode
              ? "bg-[#ec4899]/20 text-[#ec4899]"
              : "text-white/30 hover:text-white/60"
          )}
        >
          {icon}
          <span className="leading-none">{title}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NodeImageGallery({ batches, nodeName }: NodeImageGalleryProps) {
  const [viewMode, setViewMode] = useState<ImageViewMode>("single");
  const [singleIndex, setSingleIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryUuid, setGalleryUuid] = useState<string | undefined>();

  // Flat list of ALL image UUIDs, oldest→newest
  const allImages = useMemo(
    () => batches.flatMap((b) => b.imageUuids),
    [batches]
  );

  const totalImages = allImages.length;

  // When new images arrive (new run completes), jump to the latest image
  useEffect(() => {
    if (totalImages > 0) {
      setSingleIndex(totalImages - 1);
    }
  }, [totalImages]);

  const goSinglePrev = useCallback(() =>
    setSingleIndex((i) => Math.max(0, i - 1)), []);
  const goSingleNext = useCallback(() =>
    setSingleIndex((i) => Math.min(totalImages - 1, i + 1)), [totalImages]);

  const openGallery = useCallback((uuid?: string) => {
    setGalleryUuid(uuid);
    setGalleryOpen(true);
  }, []);

  if (totalImages === 0) return null;

  const currentUuid = allImages[singleIndex] ?? "";
  // Latest batch (last in the array)
  const latestBatch = batches[batches.length - 1];

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Gallery panel */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-2 mb-2 mt-1 rounded-lg overflow-hidden border border-white/[0.06] bg-black/20">
        {/* Top bar: mode toggle + counter + fullscreen button */}
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-white/[0.05]">
          <ModeToggle current={viewMode} onChange={setViewMode} />

          <div className="flex items-center gap-1.5">
            {/* Image counter */}
            <span className="text-[9px] font-mono text-white/30">
              {viewMode === "single"
                ? `${singleIndex + 1}/${totalImages}`
                : `${totalImages} images`}
            </span>

            {/* Open fullscreen */}
            <button
              title="Open in gallery"
              onClick={() => openGallery(currentUuid)}
              className={cn(
                "nodrag w-5 h-5 rounded flex items-center justify-center",
                "text-white/25 hover:text-[#ec4899] hover:bg-[#ec4899]/10",
                "transition-all duration-150"
              )}
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <AnimatePresence mode="wait">
          {viewMode === "single" ? (
            <motion.div
              key="single"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {/* Single image view with arrow navigation */}
              <div className="relative group">
                <ImageCard
                  uuid={currentUuid}
                  onClick={openGallery}
                  className="aspect-[4/3] w-full"
                />
                {/* Left arrow */}
                {singleIndex > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goSinglePrev(); }}
                    className={cn(
                      "nodrag absolute left-1.5 top-1/2 -translate-y-1/2",
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      "bg-black/70 border border-white/10",
                      "text-white/60 hover:text-white",
                      "opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Right arrow */}
                {singleIndex < totalImages - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goSingleNext(); }}
                    className={cn(
                      "nodrag absolute right-1.5 top-1/2 -translate-y-1/2",
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      "bg-black/70 border border-white/10",
                      "text-white/60 hover:text-white",
                      "opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    )}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ) : viewMode === "batch" ? (
            <motion.div
              key="batch"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="p-2 flex flex-col gap-2"
            >
              {/* Show most recent batch first */}
              {[...batches].reverse().map((batch) => (
                <div key={batch.runIndex}>
                  <p className="text-[8px] text-white/20 font-mono mb-1">
                    Run {batch.runIndex + 1} · {batch.imageUuids.length} image{batch.imageUuids.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {batch.imageUuids.map((uuid) => (
                      <ImageCard
                        key={uuid}
                        uuid={uuid}
                        onClick={openGallery}
                        className="aspect-square"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="p-2"
            >
              {/* Flat 2×N grid: most recent first */}
              {batches.length > 1 && (
                <p className="text-[8px] text-white/20 font-mono mb-1">
                  {batches.length} runs · {totalImages} images total
                </p>
              )}
              <div className="grid grid-cols-2 gap-1">
                {[...allImages].reverse().map((uuid, revIdx) => (
                  <ImageCard
                    key={`${uuid}-${revIdx}`}
                    uuid={uuid}
                    onClick={openGallery}
                    className="aspect-square"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Fullscreen gallery portal */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {galleryOpen && (
          <FullscreenGallery
            nodeName={nodeName}
            batches={batches}
            allImageUuids={allImages}
            initialUuid={galleryUuid}
            onClose={() => setGalleryOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
