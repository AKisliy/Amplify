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
  Play,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadedMedia } from "@/features/media/useMediaUpload";

// ─── Motion presets ────────────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 320, damping: 30 };
const SPRING_SLOW = { type: "spring" as const, stiffness: 200, damping: 28 };

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tool = "none" | "crop" | "annotate";

interface Annotation {
  id: string;
  xPct: number;
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

// ─── Canvas helper ─────────────────────────────────────────────────────────────

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

    const fullW = img.naturalWidth * cos + img.naturalHeight * sin;
    const fullH = img.naturalWidth * sin + img.naturalHeight * cos;

    let outW = fullW, outH = fullH, cropX = 0, cropY = 0;

    if (cropBox) {
      cropX = (cropBox.x / 100) * fullW;
      cropY = (cropBox.y / 100) * fullH;
      outW = (cropBox.w / 100) * fullW;
      outH = (cropBox.h / 100) * fullH;
    }

    canvas.width = Math.round(outW);
    canvas.height = Math.round(outH);

    ctx.save();
    ctx.translate(-cropX, -cropY);
    ctx.translate(fullW / 2, fullH / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92
    );
  });
}

// ─── Image Editor ──────────────────────────────────────────────────────────────

interface ImageEditorProps {
  media: UploadedMedia;
  onReplaceMedia?: MediaLightboxProps["onReplaceMedia"];
  onSaved?: (newId: string, newUrl: string) => void;
}

function ImageEditor({ media, onReplaceMedia, onSaved }: ImageEditorProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [tool, setTool] = useState<Tool>("none");

  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingAnnotation, setPendingAnnotation] = useState<{ xPct: number; yPct: number } | null>(null);
  const [annotationText, setAnnotationText] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset edits when switching media
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setCropBox(null);
    setAnnotations([]);
    setTool("none");
    setIsDirty(false);
    setSaveError(null);
  }, [media.id]);

  const relPct = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  // ── Crop drag ─────────────────────────────────────────────────────────────

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

  // ── Annotation ────────────────────────────────────────────────────────────

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

  // ── Actions ───────────────────────────────────────────────────────────────

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

  const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: "none", label: "View", icon: <Maximize2 className="w-3.5 h-3.5" /> },
    { id: "crop", label: "Crop", icon: <Crop className="w-3.5 h-3.5" /> },
    { id: "annotate", label: "Annotate", icon: <Pen className="w-3.5 h-3.5" /> },
  ];

  const showCrop = cropBox && cropBox.w > 1 && cropBox.h > 1;

  const hintText =
    tool === "crop"
      ? "Drag to select crop area · Save to apply"
      : tool === "annotate"
      ? "Click anywhere to pin a note · Enter to confirm"
      : "Pick a tool below to edit · Zoom or rotate";

  return (
    <div className="flex flex-col h-full relative">
      {/* ── Canvas area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex items-center justify-center select-none min-h-0">
        <div
          ref={containerRef}
          className={cn(
            "relative inline-block",
            tool === "crop" && "cursor-crosshair",
            tool === "annotate" && "cursor-cell"
          )}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: "transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
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
            className="max-w-[74vw] max-h-[58vh] rounded-2xl object-contain shadow-[0_8px_80px_rgba(0,0,0,0.9)] block"
            draggable={false}
          />

          {/* ── Premium crop overlay ──────────────────────────────────────── */}
          {showCrop && (
            <>
              {/* Outer scrim via box-shadow */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.w}%`,
                  height: `${cropBox.h}%`,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
                }}
              />

              {/* Crop border */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.w}%`,
                  height: `${cropBox.h}%`,
                  border: "1px solid rgba(255,255,255,0.45)",
                }}
              />

              {/* Rule-of-thirds grid */}
              {[33, 66].map((p) => (
                <div
                  key={`h${p}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y + (cropBox.h * p) / 100}%`,
                    width: `${cropBox.w}%`,
                    height: 1,
                    background: "rgba(255,255,255,0.16)",
                  }}
                />
              ))}
              {[33, 66].map((p) => (
                <div
                  key={`v${p}`}
                  className="absolute pointer-events-none"
                  style={{
                    top: `${cropBox.y}%`,
                    left: `${cropBox.x + (cropBox.w * p) / 100}%`,
                    width: 1,
                    height: `${cropBox.h}%`,
                    background: "rgba(255,255,255,0.16)",
                  }}
                />
              ))}

              {/* L-shaped corner handles */}
              {[
                { x: cropBox.x, y: cropBox.y, bt: true, bl: true },
                { x: cropBox.x + cropBox.w, y: cropBox.y, bt: true, br: true },
                { x: cropBox.x, y: cropBox.y + cropBox.h, bb: true, bl: true },
                { x: cropBox.x + cropBox.w, y: cropBox.y + cropBox.h, bb: true, br: true },
              ].map((h, i) => (
                <div
                  key={i}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    width: 14,
                    height: 14,
                    transform: "translate(-50%, -50%)",
                    borderTop: h.bt ? "3px solid #fff" : undefined,
                    borderBottom: h.bb ? "3px solid #fff" : undefined,
                    borderLeft: h.bl ? "3px solid #fff" : undefined,
                    borderRight: h.br ? "3px solid #fff" : undefined,
                  }}
                />
              ))}
            </>
          )}

          {/* ── Annotation pins ───────────────────────────────────────────── */}
          <AnimatePresence>
            {annotations.map((ann) => (
              <motion.div
                key={ann.id}
                initial={{ scale: 0.3, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={SPRING}
                className="absolute z-10 pointer-events-none"
                style={{ left: `${ann.xPct}%`, top: `${ann.yPct}%` }}
              >
                <div className="flex flex-col items-start -translate-y-full -translate-x-1">
                  {/* Glowing pin */}
                  <div className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-300/40 shadow-[0_0_10px_rgba(251,191,36,0.7)] self-start ml-1.5" />
                  {/* Note card */}
                  <div className="mt-0.5 bg-amber-400/95 backdrop-blur-md text-amber-950 text-xs font-semibold px-2.5 py-1.5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] max-w-[160px] leading-snug">
                    {ann.text}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ── Pending annotation input ──────────────────────────────────── */}
          <AnimatePresence>
            {pendingAnnotation && (
              <motion.div
                key="pending"
                initial={{ scale: 0.85, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={SPRING}
                className="absolute z-20"
                style={{
                  left: `${pendingAnnotation.xPct}%`,
                  top: `${pendingAnnotation.yPct}%`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-zinc-900/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] p-3.5 border border-white/[0.09] flex flex-col gap-2.5 min-w-[220px] -translate-y-2">
                  <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-bold tracking-widest uppercase">
                    <Pen className="w-3 h-3" />
                    Add note
                  </div>
                  <textarea
                    autoFocus
                    value={annotationText}
                    onChange={(e) => setAnnotationText(e.target.value)}
                    placeholder="Type your note…"
                    rows={2}
                    className="w-full text-sm p-2 rounded-xl border border-white/[0.09] bg-white/[0.05] text-white placeholder:text-white/25 resize-none focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        confirmAnnotation();
                      }
                      if (e.key === "Escape") setPendingAnnotation(null);
                    }}
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      className="text-white/35 text-xs hover:text-white/60 transition-colors px-2 py-1 rounded-lg"
                      onClick={() => setPendingAnnotation(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 active:scale-95 text-amber-950 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                      onClick={confirmAnnotation}
                    >
                      <Check className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Save error ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {saveError && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={SPRING}
            className="text-center text-xs text-red-400/90 py-1 flex-shrink-0"
          >
            {saveError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Hint text ─────────────────────────────────────────────────────────── */}
      <p className="text-center text-[11px] text-white/18 pb-1 flex-shrink-0 tracking-wide">
        {hintText}
      </p>

      {/* ── Floating command center ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-center gap-2 pb-5 px-4">

        {/* Tool selector pill */}
        <div className="flex items-center gap-0.5 bg-white/[0.05] backdrop-blur-2xl border border-white/[0.07] rounded-2xl p-1 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          {tools.map((t) => (
            <motion.button
              key={t.id}
              onClick={() => setTool(t.id)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={SPRING}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150",
                tool === t.id ? "text-white" : "text-white/35 hover:text-white/65"
              )}
            >
              {tool === t.id && (
                <motion.div
                  layoutId="tool-active-bg"
                  className="absolute inset-0 bg-white/[0.11] rounded-xl"
                  transition={SPRING}
                />
              )}
              <span className="relative">{t.icon}</span>
              <span className="relative hidden sm:inline">{t.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/[0.09] rounded-full flex-shrink-0" />

        {/* Zoom control */}
        <div className="flex items-center gap-0.5 bg-white/[0.05] backdrop-blur-2xl border border-white/[0.07] rounded-2xl px-2.5 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={SPRING}
            className="h-5 w-5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </motion.button>
          <span className="text-white/50 text-xs font-mono w-10 text-center tabular-nums select-none">
            {Math.round(zoom * 100)}%
          </span>
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={SPRING}
            className="h-5 w-5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* Rotate button */}
        <motion.button
          whileHover={{ scale: 1.08, rotate: 20 }}
          whileTap={{ scale: 0.94 }}
          transition={SPRING}
          onClick={handleRotate}
          className="w-9 h-9 flex items-center justify-center bg-white/[0.05] backdrop-blur-2xl border border-white/[0.07] rounded-xl text-white/40 hover:text-white transition-colors shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex-shrink-0"
        >
          <RotateCw className="w-4 h-4" />
        </motion.button>

        {/* Reset — appears when dirty */}
        <AnimatePresence>
          {isDirty && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, x: -6 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -6 }}
              transition={SPRING}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] backdrop-blur-2xl border border-white/[0.07] rounded-xl text-white/35 hover:text-white/65 text-xs transition-colors shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex-shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Divider before save */}
        <AnimatePresence>
          {onReplaceMedia && isDirty && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-px h-6 bg-white/[0.09] rounded-full flex-shrink-0"
            />
          )}
        </AnimatePresence>

        {/* Save button */}
        <AnimatePresence>
          {onReplaceMedia && isDirty && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85, x: 8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={SPRING}
              whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgba(255,255,255,0.18)" }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-zinc-900 text-xs font-bold shadow-[0_4px_20px_rgba(255,255,255,0.12)] hover:bg-white/90 disabled:opacity-55 transition-all flex-shrink-0"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isSaving ? "Saving…" : "Save changes"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Video Editor ──────────────────────────────────────────────────────────────

function VideoEditor({ media }: { media: UploadedMedia }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrim, setShowTrim] = useState(false);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.currentTime = trimStart;
      void v.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (isPlaying && trimEnd > 0 && currentTime >= trimEnd) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, [currentTime, trimEnd, isPlaying]);

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Video stage ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 relative min-h-0">
        <video
          ref={videoRef}
          src={media.url}
          className="max-w-full max-h-[56vh] rounded-2xl shadow-[0_8px_80px_rgba(0,0,0,0.9)] bg-black"
          controls={false}
          playsInline
          onLoadedMetadata={onLoaded}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
        />

        {/* Big play overlay */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.button
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={SPRING}
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="pointer-events-auto w-16 h-16 rounded-full bg-white/[0.1] backdrop-blur-2xl border border-white/[0.15] flex items-center justify-center shadow-2xl hover:bg-white/[0.18] transition-colors">
                <Play className="w-7 h-7 text-white ml-1" fill="white" />
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pb-6 space-y-3">
        {/* Time stamps */}
        <div className="flex items-center justify-between text-white/30 text-[11px] font-mono tabular-nums">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>

        {/* Scrubber track */}
        <div className="relative h-7 flex items-center">
          {/* Track background */}
          <div className="absolute left-0 right-0 h-[3px] rounded-full bg-white/[0.08]">
            {/* Played */}
            <div
              className="absolute top-0 h-full rounded-full bg-white/20 transition-none"
              style={{ width: `${progress * 100}%` }}
            />
            {/* Trim range */}
            {duration > 0 && (
              <div
                className="absolute top-0 h-full rounded-full bg-white/50"
                style={{
                  left: `${(trimStart / duration) * 100}%`,
                  right: `${100 - (trimEnd / duration) * 100}%`,
                }}
              />
            )}
          </div>

          {/* Heavy playhead */}
          {duration > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.55),0_2px_8px_rgba(0,0,0,0.5)] ring-2 ring-white/25 z-10 pointer-events-none"
              style={{ left: `calc(${progress * 100}% - 9px)` }}
            />
          )}

          {/* Invisible range input */}
          <input
            type="range"
            min={0}
            max={duration}
            step={0.05}
            value={currentTime}
            onChange={(e) => {
              const t = +e.target.value;
              setCurrentTime(t);
              if (videoRef.current) videoRef.current.currentTime = t;
            }}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Bottom control row */}
        <div className="flex items-center gap-3 pt-1">
          {/* Play / Pause */}
          <motion.button
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.93 }}
            transition={SPRING}
            onClick={togglePlay}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.07] border border-white/[0.09] text-white hover:bg-white/[0.13] transition-colors flex-shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" fill="white" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" fill="white" />
            )}
          </motion.button>

          <div className="flex-1" />

          {/* Duration */}
          <span className="text-white/25 text-xs font-mono tabular-nums">
            {fmt(trimEnd - trimStart)}
          </span>

          {/* Trim toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={SPRING}
            onClick={() => setShowTrim((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
              showTrim
                ? "bg-white/[0.1] border-white/[0.15] text-white"
                : "bg-white/[0.04] border-white/[0.07] text-white/35 hover:text-white/65"
            )}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trim</span>
          </motion.button>
        </div>

        {/* Trim panel */}
        <AnimatePresence>
          {showTrim && duration > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_SLOW}
              className="overflow-hidden"
            >
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3 mt-1">
                <p className="text-white/25 text-[10px] font-bold tracking-widest uppercase">
                  Trim range
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {(["start", "end"] as const).map((which) => {
                    const val = which === "start" ? trimStart : trimEnd;
                    const min = which === "start" ? 0 : trimStart + 0.5;
                    const max = which === "start" ? trimEnd - 0.5 : duration;
                    const set = which === "start" ? setTrimStart : setTrimEnd;
                    return (
                      <div key={which}>
                        <label className="text-white/25 text-[10px] uppercase tracking-widest">
                          {which === "start" ? "In" : "Out"}
                        </label>
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="range"
                            min={min}
                            max={max}
                            step={0.05}
                            value={val}
                            onChange={(e) => {
                              const t = +e.target.value;
                              set(t);
                              if (videoRef.current) videoRef.current.currentTime = t;
                            }}
                            className="flex-1 accent-white"
                          />
                          <span className="text-white/50 text-xs font-mono w-10 text-right tabular-nums">
                            {fmt(val)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-white/18 text-[10px]">
                  Server-side trim requires backend processing
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            background:
              "radial-gradient(ellipse at 50% 20%, rgba(12,12,18,0.98) 0%, rgba(3,3,5,1) 65%)",
          }}
        >
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.07] flex-shrink-0">
                {isVideo ? (
                  <Film className="w-3.5 h-3.5 text-white/40" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-white/40" />
                )}
              </div>
              <span className="text-white/60 text-sm font-medium truncate max-w-[200px]">
                {current.name || `Media ${index + 1}`}
              </span>
              {items.length > 1 && (
                <span className="text-white/22 text-xs font-mono flex-shrink-0">
                  {index + 1} / {items.length}
                </span>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={SPRING}
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* ── Editor area ─────────────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id || `view-${index}`}
                initial={{ opacity: 0, scale: 0.98, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -6 }}
                transition={SPRING}
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

            {/* ── Navigation arrows ─────────────────────────────────────────── */}
            {items.length > 1 && (
              <>
                <motion.button
                  animate={{ opacity: index === 0 ? 0.18 : 1 }}
                  whileHover={index === 0 ? {} : { scale: 1.1, x: -2 }}
                  whileTap={index === 0 ? {} : { scale: 0.93 }}
                  transition={SPRING}
                  className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] backdrop-blur-2xl border border-white/[0.07] text-white shadow-xl",
                    index === 0
                      ? "pointer-events-none"
                      : "hover:bg-white/[0.11] transition-colors"
                  )}
                  onClick={() => setIndex((i) => i - 1)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>

                <motion.button
                  animate={{ opacity: index === items.length - 1 ? 0.18 : 1 }}
                  whileHover={index === items.length - 1 ? {} : { scale: 1.1, x: 2 }}
                  whileTap={index === items.length - 1 ? {} : { scale: 0.93 }}
                  transition={SPRING}
                  className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] backdrop-blur-2xl border border-white/[0.07] text-white shadow-xl",
                    index === items.length - 1
                      ? "pointer-events-none"
                      : "hover:bg-white/[0.11] transition-colors"
                  )}
                  onClick={() => setIndex((i) => i + 1)}
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </>
            )}
          </div>

          {/* ── Filmstrip ────────────────────────────────────────────────────── */}
          {items.length > 1 && (
            <div className="flex-shrink-0 h-[78px] border-t border-white/[0.06] flex items-center gap-2 px-5 overflow-x-auto">
              {items.map((item, i) => {
                const itemIsVideo =
                  item.type === "video" ||
                  item.contentType?.startsWith("video/") ||
                  !!item.url.toLowerCase().match(/\.(mp4|webm|mov)(\?|$)/);
                const isActive = i === index;

                return (
                  <motion.button
                    key={item.id || `thumb-${i}`}
                    onClick={() => setIndex(i)}
                    whileHover={{ scale: isActive ? 1 : 1.1 }}
                    whileTap={{ scale: 0.94 }}
                    transition={SPRING}
                    className={cn(
                      "relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200",
                      isActive
                        ? "w-14 h-14 border-white/50 shadow-[0_0_18px_rgba(255,255,255,0.12)]"
                        : "w-11 h-11 border-white/[0.07] opacity-35 hover:opacity-60"
                    )}
                  >
                    {itemIsVideo ? (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-900/80">
                        <Film className="w-4 h-4 text-white/35" />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt={item.name || "Thumb"}
                        className="h-full w-full object-cover"
                      />
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="filmstrip-ring"
                        className="absolute inset-0 rounded-[10px] ring-2 ring-inset ring-white/25"
                        transition={SPRING}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
