"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getByJobAndNodeV1ReviewJobJobIdNodeNodeIdGet,
  completeTaskV1ReviewTaskIdCompletePost,
  getTaskV1ReviewTaskIdGet,
  regenerateShotV1ReviewTaskIdRegenerateShotPost,
  type ManualReviewTaskResponse,
} from "@/lib/api/template-service";
import { mediaApi } from "@/features/media/api";

// ---------------------------------------------------------------------------

const VEO_MODELS = [
  { value: "veo-3.1-generate",          label: "Veo 3.1" },
  { value: "veo-3.1-fast-generate",     label: "Veo 3.1 Fast" },
  { value: "veo-3.1-lite-generate-001", label: "Veo 3.1 Lite" },
] as const;

// ---------------------------------------------------------------------------

interface RawShot {
  slot_index: number;
  current_uuid: string;
  original_uuid: string;
  regen_status: string | null;
  gen_params: {
    prompt: string;
    negative_prompt: string;
    resolution: string;
    aspect_ratio: string;
    duration: number;
    model: string;
    first_frame_uuid: string | null;
    last_frame_uuid: string | null;
  };
}

interface ShotState {
  slotIndex: number;
  currentUuid: string;
  originalUuid: string;
  regenStatus: string | null;
  prompt: string;
  model: string;
  // locked params (not editable but needed for regen)
  negativePrompt: string;
  resolution: string;
  aspectRatio: string;
  duration: number;
}

function parseShots(task: ManualReviewTaskResponse): ShotState[] {
  const rawShots = (task.payload?.shots ?? []) as RawShot[];
  return rawShots.map((s) => ({
    slotIndex:     s.slot_index,
    currentUuid:   s.current_uuid,
    originalUuid:  s.original_uuid,
    regenStatus:   s.regen_status,
    prompt:        s.gen_params?.prompt ?? "",
    model:         s.gen_params?.model ?? "veo-3.1-lite-generate-001",
    negativePrompt: s.gen_params?.negative_prompt ?? "",
    resolution:    s.gen_params?.resolution ?? "720p",
    aspectRatio:   s.gen_params?.aspect_ratio ?? "16:9",
    duration:      s.gen_params?.duration ?? 8,
  }));
}

// ---------------------------------------------------------------------------

interface ScriptSupervisorDialogProps {
  jobId: string;
  nodeId: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------

export function ScriptSupervisorDialog({ jobId, nodeId, onClose }: ScriptSupervisorDialogProps) {
  const [taskId,       setTaskId]       = useState<string | null>(null);
  const [shots,        setShots]        = useState<ShotState[]>([]);
  const [selectedIdx,  setSelectedIdx]  = useState(0);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [modelOpen,    setModelOpen]    = useState(false);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch task on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: apiErr } = await getByJobAndNodeV1ReviewJobJobIdNodeNodeIdGet({
          path: { job_id: jobId, node_id: nodeId },
        });
        if (cancelled) return;
        if (apiErr || !data) { setError("No pending review task found."); return; }
        setTaskId(data.id);
        setShots(parseShots(data));
      } catch {
        if (!cancelled) setError("Failed to load review task.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jobId, nodeId]);

  // ── Polling when any shot is regenerating ──────────────────────────────────
  useEffect(() => {
    const hasRegen = shots.some((s) => s.regenStatus === "regenerating");
    if (!hasRegen || !taskId) {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
      return;
    }

    if (pollTimerRef.current) return; // already polling

    pollTimerRef.current = setInterval(async () => {
      try {
        const { data } = await getTaskV1ReviewTaskIdGet({ path: { task_id: taskId } });
        if (!data) return;
        setShots(parseShots(data));
      } catch { /* silent */ }
    }, 3000);

    return () => {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    };
  }, [shots, taskId]);

  // ── Reset video when switching shots ────────────────────────────────────────
  useEffect(() => {
    setIsPlaying(false);
    setModelOpen(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [selectedIdx]);

  // ── Video controls ──────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.pause(); setIsPlaying(false); }
    else           { v.play().catch(() => {}); setIsPlaying(true); }
  }, [isPlaying]);

  // ── Prompt / model edits ────────────────────────────────────────────────────
  const handlePromptChange = (value: string) =>
    setShots((prev) => prev.map((s, i) => i === selectedIdx ? { ...s, prompt: value } : s));

  const handleModelChange = (model: string) => {
    setShots((prev) => prev.map((s, i) => i === selectedIdx ? { ...s, model } : s));
    setModelOpen(false);
  };

  // ── Regenerate single shot ──────────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (!taskId) return;
    const shot = shots[selectedIdx];
    if (!shot || shot.regenStatus === "regenerating") return;

    try {
      const { data, error: apiErr } = await regenerateShotV1ReviewTaskIdRegenerateShotPost({
        path: { task_id: taskId },
        body: {
          slotIndex: shot.slotIndex,
          params: {
            prompt:          shot.prompt,
            negativePrompt:  shot.negativePrompt,
            resolution:      shot.resolution,
            aspectRatio:     shot.aspectRatio,
            duration:        shot.duration,
            model:           shot.model,
          },
        },
      });
      if (apiErr || !data) { setError("Failed to trigger regeneration."); return; }
      setShots(parseShots(data));
    } catch {
      setError("Failed to trigger regeneration.");
    }
  }, [taskId, shots, selectedIdx]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!taskId) return;
    setIsSubmitting(true);
    try {
      const { error: apiErr } = await completeTaskV1ReviewTaskIdCompletePost({
        path: { task_id: taskId },
        body: { decision: { final_uuids: shots.map((s) => s.currentUuid) } },
      });
      if (apiErr) throw apiErr;
      onClose();
    } catch {
      setError("Failed to submit. Please try again.");
      setIsSubmitting(false);
    }
  }, [taskId, shots, onClose]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const currentShot = shots[selectedIdx];
  const currentVideoUrl = currentShot?.currentUuid
    ? mediaApi.getMediaUrl(currentShot.currentUuid, "Original")
    : undefined;
  const currentModel = VEO_MODELS.find((m) => m.value === currentShot?.model) ?? VEO_MODELS[2];
  const isRegenerating = currentShot?.regenStatus === "regenerating";

  // ── Render ──────────────────────────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-semibold text-base">Script Supervisor</h2>
          {!isLoading && shots.length > 0 && (
            <span className="text-white/30 text-sm">
              {shots.length} shot{shots.length !== 1 ? "s" : ""}
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

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-white/40">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading review task…</span>
        </div>
      ) : error && shots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* ── Main content: two boxes ──────────────────────────────────── */}
          <div className="flex-1 flex gap-5 px-6 py-5 min-h-0 items-stretch">

            {/* ── LEFT: Video box ───────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3 shrink-0 w-56">
              {/* Shot navigation */}
              <div className="flex items-center gap-3">
                <button
                  disabled={selectedIdx === 0}
                  onClick={() => setSelectedIdx((i) => i - 1)}
                  className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white/50 text-sm tabular-nums">
                  Shot {selectedIdx + 1} / {shots.length}
                </span>
                <button
                  disabled={selectedIdx === shots.length - 1}
                  onClick={() => setSelectedIdx((i) => i + 1)}
                  className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Video player — always 9:16 (vertical/reels) */}
              <div
                className="relative bg-black/60 rounded-xl overflow-hidden border border-white/10 cursor-pointer w-full aspect-[9/16]"
                onClick={togglePlay}
              >
                {currentVideoUrl ? (
                  <video
                    ref={videoRef}
                    key={currentVideoUrl}
                    src={currentVideoUrl}
                    className="w-full h-full object-contain"
                    onEnded={() => setIsPlaying(false)}
                    playsInline
                    loop
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-sm">
                    {isRegenerating ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                        <span className="text-orange-400/70 text-xs">Regenerating…</span>
                      </div>
                    ) : "No video"}
                  </div>
                )}

                {/* Regenerating overlay */}
                {currentVideoUrl && isRegenerating && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
                      <span className="text-orange-400/80 text-xs">Regenerating…</span>
                    </div>
                  </div>
                )}

                {/* Play/pause overlay */}
                {currentVideoUrl && !isPlaying && !isRegenerating && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                )}

                {/* Pause overlay */}
                {currentVideoUrl && isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <Pause className="w-5 h-5 text-white" fill="white" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Prompt box ─────────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              <label className="text-[11px] text-white/40 uppercase tracking-wide mb-2 shrink-0">
                Veo Prompt
              </label>

              <div className="flex-1 flex flex-col rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden min-h-0">
                <textarea
                  className={cn(
                    "flex-1 p-4 bg-transparent text-white/80 text-sm resize-none outline-none",
                    "placeholder:text-white/20 leading-relaxed min-h-0",
                    "disabled:opacity-50"
                  )}
                  value={currentShot?.prompt ?? ""}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  disabled={isRegenerating}
                  placeholder="Enter Veo prompt…"
                />

                {/* Google Flow–style bottom bar */}
                <div className="flex items-center justify-between px-3 py-2.5 border-t border-white/10 bg-white/[0.02] shrink-0">
                  {/* Model selector */}
                  <div className="relative">
                    <button
                      onClick={() => setModelOpen((v) => !v)}
                      disabled={isRegenerating}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs",
                        "text-white/60 hover:text-white",
                        "bg-white/[0.06] hover:bg-white/10 border border-white/10",
                        "transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      )}
                    >
                      {currentModel.label}
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>

                    {modelOpen && (
                      <div className="absolute bottom-full mb-1.5 left-0 bg-[#12121f] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 min-w-[160px]">
                        {VEO_MODELS.map((m) => (
                          <button
                            key={m.value}
                            onClick={() => handleModelChange(m.value)}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-xs transition-colors whitespace-nowrap",
                              currentShot?.model === m.value
                                ? "text-orange-400 bg-orange-500/10"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Regenerate button — Google Flow send arrow style */}
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    title="Regenerate this shot with current prompt"
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-full transition-colors",
                      "bg-orange-500 hover:bg-orange-400 text-white",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isRegenerating
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <RefreshCw className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer: shot strip + submit ──────────────────────────────── */}
          <div className="border-t border-white/10 px-6 py-4 flex items-center gap-4 shrink-0">
            {/* Shot strip */}
            <div className="flex gap-2 flex-1 overflow-x-auto pb-0.5">
              {shots.map((shot, i) => {
                const isSelected    = i === selectedIdx;
                const isRegenStatus = shot.regenStatus === "regenerating";
                const isRegenDone   = !isRegenStatus && shot.currentUuid !== shot.originalUuid;

                return (
                  <button
                    key={`${shot.slotIndex}-${shot.currentUuid}`}
                    onClick={() => setSelectedIdx(i)}
                    title={`Shot ${i + 1}`}
                    className={cn(
                      "relative shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                      "bg-black/40",
                      isSelected
                        ? "border-orange-500 shadow-[0_0_0_1px_#f9731680]"
                        : "border-white/10 hover:border-white/25"
                    )}
                    style={{ width: 52, aspectRatio: "9/16" }}
                  >
                    <video
                      src={mediaApi.getMediaUrl(shot.currentUuid, "Original")}
                      muted
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />

                    {/* Overlay: shot number */}
                    <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none">
                      <span className="text-[10px] font-semibold text-white bg-black/60 rounded px-1 leading-snug self-start">
                        {i + 1}
                      </span>

                      {/* Status badge */}
                      {isRegenStatus && (
                        <span className="text-[9px] text-orange-400 bg-black/70 rounded px-1 leading-snug flex items-center gap-0.5 self-start">
                          <Loader2 className="w-2 h-2 animate-spin" />
                          regen
                        </span>
                      )}
                      {isRegenDone && !isRegenStatus && (
                        <span className="text-[9px] text-green-400 bg-black/70 rounded px-1 leading-snug self-start">
                          ✓ new
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Inline error */}
            {error && (
              <p className="text-red-400 text-xs shrink-0">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !taskId || shots.some((s) => s.regenStatus === "regenerating")}
              className={cn(
                "shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors",
                "bg-orange-500 text-white hover:bg-orange-400",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Check className="w-4 h-4" />
              }
              {isSubmitting ? "Submitting…" : "Approve & Continue"}
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
