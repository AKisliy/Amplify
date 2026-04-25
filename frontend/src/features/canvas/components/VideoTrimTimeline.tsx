"use client";

import { useEffect, useRef, useState } from "react";

const FRAME_COUNT = 10;

interface VideoTrimTimelineProps {
  videoUrl: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  currentTime: number;
  onTrimChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

export function VideoTrimTimeline({
  videoUrl,
  duration,
  trimStart,
  trimEnd,
  currentTime,
  onTrimChange,
  onSeek,
}: VideoTrimTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const draggingRef = useRef<"start" | "end" | null>(null);

  // Refs to avoid stale closures in mousemove handler
  const trimStartRef = useRef(trimStart);
  const trimEndRef = useRef(trimEnd);
  const durationRef = useRef(duration);
  useEffect(() => { trimStartRef.current = trimStart; }, [trimStart]);
  useEffect(() => { trimEndRef.current = trimEnd; }, [trimEnd]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Extract filmstrip frames from an offscreen video element
  useEffect(() => {
    if (!videoUrl || duration <= 0) return;

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";

    const extracted: string[] = [];
    let idx = 0;
    let cancelled = false;

    const seekNext = () => {
      if (cancelled || idx >= FRAME_COUNT) {
        if (!cancelled) setFrames([...extracted]);
        return;
      }
      video.currentTime = idx === 0 ? 0 : (idx / (FRAME_COUNT - 1)) * duration;
    };

    const onSeeked = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, 160, 90);
          extracted.push(canvas.toDataURL("image/jpeg", 0.6));
        } else {
          extracted.push("");
        }
      } catch {
        // CORS-tainted canvas — show placeholder
        extracted.push("");
      }
      idx++;
      seekNext();
    };

    video.addEventListener("loadedmetadata", seekNext);
    video.addEventListener("seeked", onSeeked);
    video.src = videoUrl;

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", seekNext);
      video.removeEventListener("seeked", onSeeked);
      video.src = "";
    };
  }, [videoUrl, duration]);

  // Global drag handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const t = ratio * durationRef.current;

      if (draggingRef.current === "start") {
        const newStart = Math.min(t, trimEndRef.current - 0.1);
        onTrimChange(newStart, trimEndRef.current);
        onSeek(newStart);
      } else {
        const newEnd = Math.max(t, trimStartRef.current + 0.1);
        onTrimChange(trimStartRef.current, newEnd);
        onSeek(newEnd);
      }
    };

    const onUp = () => { draggingRef.current = null; };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [onTrimChange, onSeek]);

  const pct = (t: number) => duration > 0 ? (t / duration) * 100 : 0;
  const startPct = pct(trimStart);
  const endPct = pct(trimEnd);
  const playPct = pct(Math.max(trimStart, Math.min(currentTime, trimEnd)));

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden select-none"
      style={{ height: 56 }}
    >
      {/* Filmstrip */}
      <div className="absolute inset-0 flex">
        {frames.length > 0
          ? frames.map((src, i) =>
              src
                ? <img key={i} src={src} alt="" className="h-full flex-1 object-cover" draggable={false} />
                : <div key={i} className="h-full flex-1 bg-white/[0.06]" />
            )
          : Array.from({ length: FRAME_COUNT }).map((_, i) => (
              <div key={i} className="h-full flex-1 bg-white/[0.04] border-r border-white/5 last:border-0 animate-pulse" />
            ))}
      </div>

      {/* Darkened regions outside trim */}
      <div className="absolute inset-y-0 left-0 bg-black/65 pointer-events-none" style={{ width: `${startPct}%` }} />
      <div className="absolute inset-y-0 right-0 bg-black/65 pointer-events-none" style={{ width: `${100 - endPct}%` }} />

      {/* Active trim region border */}
      <div
        className="absolute inset-y-0 border-t-2 border-b-2 border-orange-500 pointer-events-none"
        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
      />

      {/* Start handle */}
      <div
        className="absolute inset-y-0 w-4 bg-orange-500 cursor-ew-resize flex items-center justify-center gap-px rounded-l-sm z-10"
        style={{ left: `${startPct}%`, transform: "translateX(-100%)" }}
        onMouseDown={(e) => { e.preventDefault(); draggingRef.current = "start"; }}
      >
        <div className="w-px h-4 bg-white/70 rounded-full" />
        <div className="w-px h-4 bg-white/70 rounded-full" />
      </div>

      {/* End handle */}
      <div
        className="absolute inset-y-0 w-4 bg-orange-500 cursor-ew-resize flex items-center justify-center gap-px rounded-r-sm z-10"
        style={{ left: `${endPct}%` }}
        onMouseDown={(e) => { e.preventDefault(); draggingRef.current = "end"; }}
      >
        <div className="w-px h-4 bg-white/70 rounded-full" />
        <div className="w-px h-4 bg-white/70 rounded-full" />
      </div>

      {/* Playhead */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)] pointer-events-none z-20"
        style={{ left: `${playPct}%`, transform: "translateX(-50%)" }}
      />
    </div>
  );
}
