"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Crop,
  Scissors,
  Pen,
  ChevronLeft,
  ChevronRight,
  Film,
  ImageIcon,
  Maximize2,
  Undo2,
  Check,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadedMedia } from "@/features/media/useMediaUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool = "none" | "crop" | "annotate";

interface Annotation {
  id: string;
  xPct: number; // percent of image width
  yPct: number;
  text: string;
}

interface CropBox {
  x: number; // percent
  y: number;
  w: number;
  h: number;
}

export interface MediaLightboxProps {
  items: UploadedMedia[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  /** Called after a successful save so the gallery can refresh */
  onSave?: (oldId: string, newId: string, newUrl: string) => void;
  /** Upload replacement image to backend and return { mediaId, mediaUrl } */
  onReplaceMedia?: (
    oldId: string,
    blob: Blob,
    mimeType: string
  ) => Promise<{ mediaId: string; mediaUrl: string }>;
}

// ─── Canvas helpers ────────────────────────────────────────────────────────────

/**
 * Render an image element onto a canvas with rotation + optional crop,
 * then return the result as a Blob.
 */
async function applyEditsToCanvas(
  img: HTMLImageElement,
  rotation: number,
  cropBox: CropBox | null
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas not supported"));

    const rad = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));

    // Full rotated dimensions
    const fullW = img.naturalWidth * cos + img.naturalHeight * sin;
    const fullH = img.naturalWidth * sin + img.naturalHeight * cos;

    // If crop box is defined, compute pixel coords within the rotated image
    let outW = fullW;
    let outH = fullH;
    let cropX = 0;
    let cropY = 0;

    if (cropBox) {
      cropX = (cropBox.x / 100) * fullW;
      cropY = (cropBox.y / 100) * fullH;
      outW = (cropBox.w / 100) * fullW;
      outH = (cropBox.h / 100) * fullH;
    }

    canvas.width = Math.round(outW);
    canvas.height = Math.round(outH);

    ctx.save();
    // Translate so we draw only the cropped region
    ctx.translate(-cropX, -cropY);
    // Center, rotate, draw
    ctx.translate(fullW / 2, fullH / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92
    );
  });
}

// ─── Image Editor ─────────────────────────────────────────────────────────────

interface ImageEditorProps {
  media: UploadedMedia;
  onReplaceMedia?: MediaLightboxProps["onReplaceMedia"];
  onSaved?: (newId: string, newUrl: string) => void;
}

function ImageEditor({ media, onReplaceMedia, onSaved }: ImageEditorProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [tool, setTool] = useState<Tool>("none");

  // Crop
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);

  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingAnnotation, setPendingAnnotation] = useState<{ xPct: number; yPct: number } | null>(null);
  const [annotationText, setAnnotationText] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const relPct = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  // ── Crop drag ────────────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool !== "crop") return;
    e.preventDefault();
    const pos = relPct(e);
    setCropStart(pos);
    setCropBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
    setIsDraggingCrop(true);
    setIsDirty(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCrop || !cropStart) return;
    const pos = relPct(e);
    setCropBox({
      x: Math.min(cropStart.x, pos.x),
      y: Math.min(cropStart.y, pos.y),
      w: Math.abs(pos.x - cropStart.x),
      h: Math.abs(pos.y - cropStart.y),
    });
  };

  const handleMouseUp = () => setIsDraggingCrop(false);

  // ── Annotate click ────────────────────────────────────────────────────────

  const handleClick = (e: React.MouseEvent) => {
    if (tool !== "annotate") return;
    const pos = relPct(e);
    setPendingAnnotation({ xPct: pos.x, yPct: pos.y });
    setAnnotationText("");
  };

  const confirmAnnotation = () => {
    if (!pendingAnnotation || !annotationText.trim()) return;
    setAnnotations((prev) => [
      ...prev,
      { id: `ann-${Date.now()}`, ...pendingAnnotation, text: annotationText },
    ]);
    setPendingAnnotation(null);
    setAnnotationText("");
    setIsDirty(true);
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
    setIsDirty(true);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setCropBox(null);
    setAnnotations([]);
    setTool("none");
    setIsDirty(false);
    setSaveError(null);
  };

  // ── Save to system (upload replacement) ─────────────────────────────────

  const handleSave = async () => {
    if (!onReplaceMedia || !imgRef.current) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const blob = await applyEditsToCanvas(imgRef.current, rotation, cropBox);
      const { mediaId, mediaUrl } = await onReplaceMedia(media.id, blob, "image/jpeg");
      onSaved?.(mediaId, mediaUrl);
      setIsDirty(false);
      setCropBox(null);
      setRotation(0);
      setZoom(1);
      setAnnotations([]);
      setTool("none");
    } catch {
      setSaveError("Save failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 flex-shrink-0">
        {[
          { id: "none" as Tool, label: "Select", icon: <Maximize2 className="w-4 h-4" /> },
          { id: "crop" as Tool, label: "Crop", icon: <Crop className="w-4 h-4" /> },
          { id: "annotate" as Tool, label: "Annotate", icon: <Pen className="w-4 h-4" /> },
        ].map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tool === t.id ? "default" : "ghost"}
            className="text-white gap-1.5 h-8"
            onClick={() => setTool(t.id)}
          >
            {t.icon}
            <span className="hidden sm:inline text-xs">{t.label}</span>
          </Button>
        ))}

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
          <Button size="icon" variant="ghost" className="h-6 w-6 text-white" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-white text-xs w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-white" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>

        <Button size="icon" variant="ghost" className="text-white h-8 w-8" onClick={handleRotate}>
          <RotateCw className="w-4 h-4" />
        </Button>

        {isDirty && (
          <Button size="sm" variant="ghost" className="text-white/60 gap-1 h-8" onClick={handleReset}>
            <Undo2 className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">Reset</span>
          </Button>
        )}

        <div className="flex-1" />

        {/* Save to system */}
        {saveError && (
          <span className="text-red-400 text-xs">{saveError}</span>
        )}
        {onReplaceMedia && isDirty && (
          <Button
            size="sm"
            className="gap-1.5 h-8"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span className="text-xs">{isSaving ? "Saving…" : "Save changes"}</span>
          </Button>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-6 select-none">
        <div
          ref={containerRef}
          className={cn(
            "relative inline-block",
            tool === "crop" && "cursor-crosshair",
            tool === "annotate" && "cursor-cell",
          )}
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: "transform 0.2s ease" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={media.url}
            alt={media.name || "Media"}
            crossOrigin="anonymous"
            className="max-w-[78vw] max-h-[62vh] rounded-xl object-contain shadow-2xl block"
            draggable={false}
          />

          {/* Crop overlay */}
          {cropBox && cropBox.w > 1 && cropBox.h > 1 && (
            <>
              {/* Dark mask outside crop */}
              <div className="absolute inset-0 bg-black/50 pointer-events-none" />
              {/* Clear crop window */}
              <div
                className="absolute border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.w}%`,
                  height: `${cropBox.h}%`,
                  boxShadow: "none",
                  backgroundColor: "transparent",
                }}
              />
              {/* Grid lines */}
              {[33, 66].map((p) => (
                <div key={`h${p}`} className="absolute pointer-events-none border-t border-white/30"
                  style={{ left: `${cropBox.x}%`, top: `${cropBox.y + (cropBox.h * p) / 100}%`, width: `${cropBox.w}%` }} />
              ))}
              {[33, 66].map((p) => (
                <div key={`v${p}`} className="absolute pointer-events-none border-l border-white/30"
                  style={{ top: `${cropBox.y}%`, left: `${cropBox.x + (cropBox.w * p) / 100}%`, height: `${cropBox.h}%` }} />
              ))}
            </>
          )}

          {/* Annotations */}
          {annotations.map((ann) => (
            <div
              key={ann.id}
              className="absolute z-10 pointer-events-none"
              style={{ left: `${ann.xPct}%`, top: `${ann.yPct}%` }}
            >
              <div className="flex items-start gap-1 -translate-y-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1 flex-shrink-0 ring-2 ring-black/50 shadow" />
                <div className="bg-yellow-400 text-black text-xs font-medium px-2 py-0.5 rounded-md shadow-lg max-w-[160px] leading-snug">
                  {ann.text}
                </div>
              </div>
            </div>
          ))}

          {/* Pending annotation input */}
          {pendingAnnotation && (
            <div
              className="absolute z-20"
              style={{ left: `${pendingAnnotation.xPct}%`, top: `${pendingAnnotation.yPct}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-3 border border-border flex flex-col gap-2 min-w-[200px] -translate-y-2">
                <textarea
                  autoFocus
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  className="w-full text-sm p-1.5 rounded border bg-muted/30 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmAnnotation(); } if (e.key === "Escape") { setPendingAnnotation(null); } }}
                />
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPendingAnnotation(null)}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={confirmAnnotation}>
                    <Check className="w-3 h-3" /> Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hint bar */}
      <div className="text-center pb-3 text-xs text-white/30">
        {tool === "crop" && "Drag to select crop area • Save changes to apply to system"}
        {tool === "annotate" && "Click anywhere to add a sticky note • Press Enter to confirm"}
        {tool === "none" && "Pick a tool above to edit • Zoom or rotate • Save changes to update in system"}
      </div>
    </div>
  );
}

// ─── Video Editor ─────────────────────────────────────────────────────────────

function VideoEditor({ media }: { media: UploadedMedia }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrim, setShowTrim] = useState(false);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const onLoaded = () => {
    const d = videoRef.current?.duration || 0;
    setDuration(d);
    setTrimStart(0);
    setTrimEnd(d);
  };

  const onTimeUpdate = () => setCurrentTime(videoRef.current?.currentTime ?? 0);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.pause(); setIsPlaying(false); }
    else { v.currentTime = trimStart; v.play(); setIsPlaying(true); }
  };

  // Pause if we exceed trim end
  useEffect(() => {
    if (isPlaying && trimEnd > 0 && currentTime >= trimEnd) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, [currentTime, trimEnd, isPlaying]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <Button
          size="sm"
          variant={showTrim ? "default" : "ghost"}
          className="text-white gap-1.5 h-8"
          onClick={() => setShowTrim((v) => !v)}
        >
          <Scissors className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">Trim</span>
        </Button>
        <div className="flex-1" />
        <span className="text-white/50 text-xs font-mono tabular-nums">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center p-4">
        <video
          ref={videoRef}
          src={media.url}
          crossOrigin="anonymous"
          className="max-w-full max-h-[58vh] rounded-xl shadow-2xl bg-black"
          controls={false}
          playsInline
          onLoadedMetadata={onLoaded}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
        />
      </div>

      {/* Controls */}
      <div className="px-6 pb-5 space-y-3">
        {/* Timeline scrubber */}
        <div className="relative h-5 flex items-center group">
          {/* Track */}
          <div className="absolute left-0 right-0 h-1.5 rounded-full bg-white/10">
            {/* Trim range highlight */}
            {duration > 0 && (
              <div
                className="absolute top-0 h-full rounded-full bg-primary/50"
                style={{ left: `${(trimStart / duration) * 100}%`, right: `${100 - (trimEnd / duration) * 100}%` }}
              />
            )}
            {/* Playhead */}
            {duration > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md ring-2 ring-primary"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
              />
            )}
          </div>
          <input
            type="range" min={0} max={duration} step={0.05} value={currentTime}
            onChange={(e) => { const t = +e.target.value; setCurrentTime(t); if (videoRef.current) videoRef.current.currentTime = t; }}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Trim sliders */}
        <AnimatePresence>
          {showTrim && duration > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white/5 rounded-xl p-3 space-y-3">
                <p className="text-white/50 text-xs font-medium tracking-wide uppercase">Trim range</p>
                <div className="grid grid-cols-2 gap-4">
                  {(["start", "end"] as const).map((which) => {
                    const val = which === "start" ? trimStart : trimEnd;
                    const min = which === "start" ? 0 : trimStart + 0.5;
                    const max = which === "start" ? trimEnd - 0.5 : duration;
                    const set = which === "start" ? setTrimStart : setTrimEnd;
                    return (
                      <div key={which}>
                        <label className="text-white/40 text-[10px] uppercase tracking-widest">
                          {which === "start" ? "In" : "Out"}
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="range" min={min} max={max} step={0.05} value={val}
                            onChange={(e) => { const t = +e.target.value; set(t); if (videoRef.current) videoRef.current.currentTime = t; }}
                            className="flex-1 accent-primary" />
                          <span className="text-white text-xs font-mono w-10 text-right tabular-nums">{fmt(val)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-white/30 text-[10px]">
                  Duration: <span className="text-white/60 font-mono">{fmt(trimEnd - trimStart)}</span>
                  <span className="ml-2 text-yellow-400/70">(Note: Server-side trim requires backend processing)</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play button */}
        <button
          onClick={togglePlay}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium"
        >
          {isPlaying
            ? <><span className="text-base">⏸</span> Pause</>
            : <><span className="text-base">▶</span> Play{showTrim ? " from In point" : ""}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Main Lightbox ─────────────────────────────────────────────────────────────

export function MediaLightbox({
  items,
  initialIndex = 0,
  open,
  onClose,
  onSave,
  onReplaceMedia,
}: MediaLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => setIndex(initialIndex), [initialIndex, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(items.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, items.length, onClose]);

  const current = items[index];

  // Determine type reliably: prefer contentType, then imageType tag, then URL heuristic
  const isVideo = current
    ? current.type === "video" ||
      current.contentType?.startsWith("video/") ||
      !!current.url.toLowerCase().match(/\.(mp4|webm|mov|avi)(\?|$)/)
    : false;

  const handleSaved = useCallback(
    (newId: string, newUrl: string) => {
      if (!current) return;
      onSave?.(current.id, newId, newUrl);
    },
    [current, onSave]
  );

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/97 backdrop-blur-xl"
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {isVideo
                ? <Film className="w-4 h-4 text-white/50 flex-shrink-0" />
                : <ImageIcon className="w-4 h-4 text-white/50 flex-shrink-0" />}
              <span className="text-white/80 text-sm font-medium truncate max-w-[220px]">
                {current.name || `Media ${index + 1}`}
              </span>
              {items.length > 1 && (
                <span className="text-white/30 text-xs flex-shrink-0">
                  {index + 1} / {items.length}
                </span>
              )}
            </div>
            <Button
              size="icon" variant="ghost"
              className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full flex-shrink-0"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id || `view-${index}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {isVideo ? (
                  <VideoEditor media={current} />
                ) : (
                  <ImageEditor
                    media={current}
                    onReplaceMedia={onReplaceMedia}
                    onSaved={handleSaved}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav arrows */}
            {items.length > 1 && (
              <>
                <button
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors",
                    index === 0 && "opacity-20 pointer-events-none"
                  )}
                  onClick={() => setIndex((i) => i - 1)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors",
                    index === items.length - 1 && "opacity-20 pointer-events-none"
                  )}
                  onClick={() => setIndex((i) => i + 1)}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Filmstrip */}
          {items.length > 1 && (
            <div className="h-[72px] border-t border-white/10 flex items-center gap-2 px-4 overflow-x-auto flex-shrink-0">
              {items.map((item, i) => {
                const itemIsVideo =
                  item.type === "video" ||
                  item.contentType?.startsWith("video/") ||
                  !!item.url.toLowerCase().match(/\.(mp4|webm|mov)(\?|$)/);
                return (
                  <button
                    key={item.id || `thumb-${i}`}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "relative h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200",
                      i === index
                        ? "border-primary scale-110 shadow-lg shadow-primary/20"
                        : "border-white/10 opacity-40 hover:opacity-70 hover:border-white/30"
                    )}
                  >
                    {itemIsVideo ? (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                        <Film className="w-4 h-4 text-white/50" />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={item.url} 
                        alt={item.name || "Thumb"} 
                        crossOrigin="anonymous"
                        className="h-full w-full object-cover" 
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
