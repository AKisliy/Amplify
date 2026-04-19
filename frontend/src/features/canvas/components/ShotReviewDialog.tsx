"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  completeManualReview,
  getManualReviewPendingByJob,
} from "@/lib/api/template-service";
import { mediaApi } from "@/features/media/api";

// ---------------------------------------------------------------------------

interface TrimState {
  start: number;
  end: number;
  duration: number;
}

interface ShotReviewDialogProps {
  jobId: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------

export function ShotReviewDialog({ jobId, onClose }: ShotReviewDialogProps) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [videoUuids, setVideoUuids] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [trims, setTrims] = useState<TrimState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch pending task on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const task = await getManualReviewPendingByJob(jobId);
        if (cancelled) return;
        if (!task) { setError("No pending review task found."); return; }
        const uuids = (
          (task.payload?.video_uuids ?? task.payload?.videoUuids ?? []) as string[]
        );
        setTaskId(task.id);
        setVideoUuids(uuids);
        setTrims(uuids.map(() => ({ start: 0, end: 8, duration: 8 })));
      } catch {
        if (!cancelled) setError("Failed to load review task.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jobId]);

  // Update duration when video metadata loads
  const handleVideoLoaded = () => {
    const dur = videoRef.current?.duration;
    if (!dur || !isFinite(dur)) return;
    setTrims((prev) =>
      prev.map((t, i) =>
        i === selectedIndex
          ? { ...t, end: t.end === 8 ? dur : t.end, duration: dur }
          : t
      )
    );
  };

  const setTrim = (field: "start" | "end", raw: number) => {
    setTrims((prev) =>
      prev.map((t, i) => {
        if (i !== selectedIndex) return t;
        if (field === "start")
          return { ...t, start: Math.min(raw, t.end - 0.1) };
        return { ...t, end: Math.max(raw, t.start + 0.1) };
      })
    );
  };

  const handleSubmit = async () => {
    if (!taskId) return;
    setIsSubmitting(true);
    try {
      await completeManualReview(taskId, {
        trims: trims.map((t, i) => ({
          videoUuid: videoUuids[i],
          trimStart: parseFloat(t.start.toFixed(2)),
          trimEnd: parseFloat(t.end.toFixed(2)),
        })),
      });
      onClose();
    } catch {
      setError("Failed to submit decision. Please try again.");
      setIsSubmitting(false);
    }
  };

  const currentTrim = trims[selectedIndex] ?? { start: 0, end: 8, duration: 8 };
  const currentVideoUrl = videoUuids[selectedIndex]
    ? mediaApi.getMediaUrl(videoUuids[selectedIndex], "Original")
    : undefined;

  const trimmedCount = trims.filter(
    (t) => t.start > 0 || t.end < t.duration
  ).length;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* ----------------------------------------------------------------- */}
      {/* Header */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-semibold text-base">Shot Review</h2>
          {!isLoading && videoUuids.length > 0 && (
            <span className="text-white/30 text-sm">
              {videoUuids.length} shot{videoUuids.length !== 1 ? "s" : ""}
              {trimmedCount > 0 && ` · ${trimmedCount} trimmed`}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors rounded-md p-1 hover:bg-white/5"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Body */}
      {/* ----------------------------------------------------------------- */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-white/40">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading review task…</span>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* Video player + trim */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-4 min-h-0">
            {/* Player */}
            <div className="relative w-full max-w-3xl aspect-video bg-black/60 rounded-xl overflow-hidden border border-white/10">
              {currentVideoUrl ? (
                <video
                  ref={videoRef}
                  key={currentVideoUrl}
                  src={currentVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                  onLoadedMetadata={handleVideoLoaded}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20 text-sm">
                  No video
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <button
                disabled={selectedIndex === 0}
                onClick={() => setSelectedIndex((i) => i - 1)}
                className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white/50 text-sm tabular-nums">
                Shot {selectedIndex + 1} / {videoUuids.length}
              </span>
              <button
                disabled={selectedIndex === videoUuids.length - 1}
                onClick={() => setSelectedIndex((i) => i + 1)}
                className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trim controls */}
            <div className="w-full max-w-3xl rounded-lg bg-white/[0.04] border border-white/10 p-4">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
                Trim — shot {selectedIndex + 1}
              </p>
              <div className="flex gap-8">
                <label className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between text-[11px] text-white/40">
                    <span>Start</span>
                    <span className="tabular-nums text-orange-400">
                      {currentTrim.start.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={currentTrim.duration}
                    step={0.1}
                    value={currentTrim.start}
                    onChange={(e) => setTrim("start", parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full accent-orange-500 cursor-pointer"
                  />
                </label>
                <label className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between text-[11px] text-white/40">
                    <span>End</span>
                    <span className="tabular-nums text-orange-400">
                      {currentTrim.end.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={currentTrim.duration}
                    step={0.1}
                    value={currentTrim.end}
                    onChange={(e) => setTrim("end", parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full accent-orange-500 cursor-pointer"
                  />
                </label>
              </div>
              {/* Visual trim bar */}
              <div className="mt-3 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500/70 rounded-full transition-all"
                  style={{
                    marginLeft: `${(currentTrim.start / currentTrim.duration) * 100}%`,
                    width: `${((currentTrim.end - currentTrim.start) / currentTrim.duration) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* Footer: shot strip + submit */}
          {/* ----------------------------------------------------------------- */}
          <div className="border-t border-white/10 px-6 py-4 flex items-center gap-4 shrink-0">
            {/* Shot strip */}
            <div className="flex gap-2 flex-1 overflow-x-auto">
              {videoUuids.map((uuid, i) => {
                const t = trims[i] ?? { start: 0, end: 8, duration: 8 };
                const isTrimmed = t.start > 0 || t.end < t.duration;
                return (
                  <button
                    key={uuid}
                    onClick={() => setSelectedIndex(i)}
                    title={`Shot ${i + 1}`}
                    className={cn(
                      "relative shrink-0 w-24 rounded-lg overflow-hidden border-2 transition-all",
                      "aspect-video bg-black/40",
                      i === selectedIndex
                        ? "border-orange-500 shadow-[0_0_0_1px_#f9731680]"
                        : "border-white/10 hover:border-white/25"
                    )}
                  >
                    <video
                      src={mediaApi.getMediaUrl(uuid, "Original")}
                      muted
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-end justify-between p-1">
                      <span className="text-[10px] font-semibold text-white bg-black/60 rounded px-1 leading-snug">
                        {i + 1}
                      </span>
                      {isTrimmed && (
                        <span className="text-[9px] text-orange-400 bg-black/60 rounded px-1 leading-snug">
                          trimmed
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Error inline */}
            {error && (
              <p className="text-red-400 text-xs shrink-0">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !taskId}
              className={cn(
                "shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors",
                "bg-orange-500 text-white hover:bg-orange-400",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isSubmitting ? "Submitting…" : "Approve & Continue"}
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
