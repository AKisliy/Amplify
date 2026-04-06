"use client";

// =============================================================================
// FullscreenGallery — Portal overlay for browsing all output images.
// =============================================================================

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import type { ImageBatch } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FullscreenGalleryProps {
  /** Node display name shown in the top bar */
  nodeName: string;
  /** All batches for this node */
  batches: ImageBatch[];
  /** Flat list of all image UUIDs (for linear navigation) */
  allImageUuids: string[];
  /** The initially-focused image uuid */
  initialUuid?: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Image thumbnail with load state
// ---------------------------------------------------------------------------

function Thumbnail({
  uuid,
  isSelected,
  onClick,
}: {
  uuid: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const url = mediaUrl(uuid);

  return (
    <button
      onClick={onClick}
      className={cn(
        "nodrag nopan relative w-full aspect-square rounded-md overflow-hidden shrink-0",
        "border-2 transition-all duration-150",
        isSelected
          ? "border-[#ec4899] shadow-[0_0_0_2px_#ec489955]"
          : "border-transparent hover:border-white/20"
      )}
    >
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/[0.04]">
          <Loader2 className="w-3 h-3 text-white/20 animate-spin" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
          <AlertCircle className="w-3 h-3 text-red-400/60" />
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
    </button>
  );
}

// ---------------------------------------------------------------------------
// Large preview
// ---------------------------------------------------------------------------

function LargePreview({ uuid }: { uuid: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const url = mediaUrl(uuid);

  // Reset to loading when the uuid changes
  useEffect(() => {
    setStatus("loading");
  }, [uuid]);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${uuid}.jpg`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [url, uuid]);

  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black/60">
      <AnimatePresence mode="wait">
        <motion.div
          key={uuid}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center w-full h-full p-6"
        >
          {status === "loading" && (
            <Loader2 className="absolute w-8 h-8 text-white/20 animate-spin" />
          )}
          {status === "error" && (
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-red-400/60" />
              <p className="text-sm text-red-400/60">Failed to load image</p>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="preview"
            className={cn(
              "max-w-full max-h-full object-contain rounded-lg",
              "shadow-[0_24px_80px_rgba(0,0,0,0.6)]",
              "transition-opacity duration-300",
              status === "loaded" ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
          />
        </motion.div>
      </AnimatePresence>

      {/* Download button — bottom-right of preview */}
      {status === "loaded" && (
        <button
          onClick={handleDownload}
          className={cn(
            "absolute bottom-4 right-4",
            "w-8 h-8 rounded-full flex items-center justify-center",
            "bg-black/60 border border-white/10",
            "text-white/50 hover:text-white hover:bg-black/80",
            "transition-all duration-150"
          )}
          title="Download image"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FullscreenGallery({
  nodeName,
  allImageUuids,
  initialUuid,
  onClose,
}: FullscreenGalleryProps) {
  const initialIdx = initialUuid
    ? Math.max(0, allImageUuids.indexOf(initialUuid))
    : 0;

  const [currentIdx, setCurrentIdx] = useState(initialIdx);
  const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([]);

  const total = allImageUuids.length;
  const currentUuid = allImageUuids[currentIdx] ?? "";

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(total - 1, idx));
      setCurrentIdx(clamped);
      // Scroll thumbnail into view
      thumbnailRefs.current[clamped]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    },
    [total]
  );

  const goPrev = useCallback(() => goTo(currentIdx - 1), [currentIdx, goTo]);
  const goNext = useCallback(() => goTo(currentIdx + 1), [currentIdx, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext]);

  // Trap scroll outside
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col",
        "bg-[oklch(0.08_0.03_264/0.97)] backdrop-blur-xl"
      )}
      // Click backdrop closes
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Top bar */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 h-12 shrink-0",
          "border-b border-white/[0.06]",
          "bg-white/[0.02]"
        )}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
            "text-white/40 hover:text-white hover:bg-white/[0.08]",
            "transition-all duration-150"
          )}
          title="Close gallery (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Node name */}
        <span className="text-sm font-semibold text-white/90 truncate flex-1">
          {nodeName}
        </span>

        {/* Counter */}
        <span className="text-xs font-mono text-white/40 shrink-0">
          {currentIdx + 1} / {total}
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Body: large preview (left) + thumbnail strip (right)               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Navigation arrow — prev */}
        <button
          onClick={goPrev}
          disabled={currentIdx === 0}
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 z-10",
            "w-9 h-9 rounded-full flex items-center justify-center",
            "bg-black/60 border border-white/10",
            "text-white/60 hover:text-white hover:bg-black/80",
            "transition-all duration-150",
            "disabled:opacity-20 disabled:cursor-not-allowed"
          )}
          title="Previous (←)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Large preview */}
        <LargePreview uuid={currentUuid} />

        {/* Navigation arrow — next */}
        <button
          onClick={goNext}
          disabled={currentIdx === total - 1}
          className={cn(
            "absolute right-[240px] top-1/2 -translate-y-1/2 z-10",
            "w-9 h-9 rounded-full flex items-center justify-center",
            "bg-black/60 border border-white/10",
            "text-white/60 hover:text-white hover:bg-black/80",
            "transition-all duration-150",
            "disabled:opacity-20 disabled:cursor-not-allowed"
          )}
          title="Next (→)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Thumbnail strip */}
        <div
          className={cn(
            "w-[220px] shrink-0 flex flex-col overflow-y-auto overflow-x-hidden",
            "border-l border-white/[0.06] bg-white/[0.02]",
            "p-3 gap-2"
          )}
        >
          {allImageUuids.map((uuid, idx) => (
            <div
              key={uuid}
              ref={(el) => { thumbnailRefs.current[idx] = el; }}
            >
              <Thumbnail
                uuid={uuid}
                isSelected={idx === currentIdx}
                onClick={() => goTo(idx)}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
