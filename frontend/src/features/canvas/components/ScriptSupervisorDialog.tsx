"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getByJobAndNodeV1ReviewJobJobIdNodeNodeIdGet,
  completeTaskV1ReviewTaskIdCompletePost,
  getTaskV1ReviewTaskIdGet,
  regenerateShotV1ReviewTaskIdRegenerateShotPost,
  getManualReviewByJobAndNodeV2,
  getManualReviewTaskV2,
  completeManualReviewV2,
  type ManualReviewTaskResponse,
} from "@/lib/api/template-service";
import { AmplifyImage } from "@/features/media/components/AmplifyImage";
import { AmplifyVideo } from "@/features/media/components/AmplifyVideo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  firstFrameUuid: string | null;
  lastFrameUuid: string | null;
}

function parseShots(task: ManualReviewTaskResponse): ShotState[] {
  const rawShots = (task.payload?.shots ?? []) as RawShot[];
  return rawShots.map((s) => ({
    slotIndex:      s.slot_index,
    currentUuid:    s.current_uuid,
    originalUuid:   s.original_uuid,
    regenStatus:    s.regen_status,
    prompt:         s.gen_params?.prompt ?? "",
    model:          s.gen_params?.model ?? "veo-3.1-lite-generate-001",
    negativePrompt: s.gen_params?.negative_prompt ?? "",
    resolution:     s.gen_params?.resolution ?? "720p",
    aspectRatio:    s.gen_params?.aspect_ratio ?? "16:9",
    duration:       s.gen_params?.duration ?? 8,
    firstFrameUuid: s.gen_params?.first_frame_uuid ?? null,
    lastFrameUuid:  s.gen_params?.last_frame_uuid ?? null,
  }));
}

// ---------------------------------------------------------------------------

interface ScriptSupervisorDialogProps {
  jobId: string;
  nodeId: string;
  onClose: () => void;
  executionVersion?: "v1" | "v2";
}

// ---------------------------------------------------------------------------

export function ScriptSupervisorDialog({ jobId, nodeId, onClose, executionVersion = "v1" }: ScriptSupervisorDialogProps) {
  const [taskId,       setTaskId]       = useState<string | null>(null);
  const [shots,        setShots]        = useState<ShotState[]>([]);
  const [selectedIdx,  setSelectedIdx]  = useState(0);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch task on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let data: ManualReviewTaskResponse | null | undefined;
        if (executionVersion === "v2") {
          data = await getManualReviewByJobAndNodeV2(jobId, nodeId) as ManualReviewTaskResponse | null;
        } else {
          const result = await getByJobAndNodeV1ReviewJobJobIdNodeNodeIdGet({
            path: { job_id: jobId, node_id: nodeId },
          });
          if (result.error) { setError("No pending review task found."); return; }
          data = result.data;
        }
        if (cancelled) return;
        if (!data) { setError("No pending review task found."); return; }
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
    if (pollTimerRef.current) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        let data: ManualReviewTaskResponse | null | undefined;
        if (executionVersion === "v2") {
          data = await getManualReviewTaskV2(taskId) as ManualReviewTaskResponse;
        } else {
          const result = await getTaskV1ReviewTaskIdGet({ path: { task_id: taskId } });
          data = result.data;
        }
        if (!data) return;
        setShots(parseShots(data));
      } catch { /* silent */ }
    }, 3000);

    return () => {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    };
  }, [shots, taskId]);

  // ── Prompt / model edits ────────────────────────────────────────────────────
  const handlePromptChange = (value: string) =>
    setShots((prev) => prev.map((s, i) => i === selectedIdx ? { ...s, prompt: value } : s));

  const handleModelChange = (model: string) =>
    setShots((prev) => prev.map((s, i) => i === selectedIdx ? { ...s, model } : s));

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
            prompt:         shot.prompt,
            negativePrompt: shot.negativePrompt,
            resolution:     shot.resolution,
            aspectRatio:    shot.aspectRatio,
            duration:       shot.duration,
            model:          shot.model,
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
      const decision = { final_uuids: shots.map((s) => s.currentUuid) };
      if (executionVersion === "v2") {
        await completeManualReviewV2(taskId, decision);
      } else {
        const { error: apiErr } = await completeTaskV1ReviewTaskIdCompletePost({
          path: { task_id: taskId },
          body: { decision },
        });
        if (apiErr) throw apiErr;
      }
      onClose();
    } catch {
      setError("Failed to submit. Please try again.");
      setIsSubmitting(false);
    }
  }, [taskId, shots, onClose]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const currentShot    = shots[selectedIdx];
  const currentModel   = VEO_MODELS.find((m) => m.value === currentShot?.model) ?? VEO_MODELS[2];
  const isRegenerating = currentShot?.regenStatus === "regenerating";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="inset-0 top-0 left-0 translate-x-0 translate-y-0 max-w-none sm:max-w-none w-screen h-screen rounded-none p-0 flex flex-col gap-0 border-0 bg-black/95"
      >
        {/* sr-only title for accessibility */}
        <DialogTitle className="sr-only">Script Supervisor</DialogTitle>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-semibold text-base">Script Supervisor</h2>
            {!isLoading && shots.length > 0 && (
              <span className="text-white/30 text-sm">
                {shots.length} shot{shots.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/5">
              <span className="sr-only">Close</span>
              ✕
            </Button>
          </DialogClose>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
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
            {/* ── Main content ─────────────────────────────────────────────── */}
            {/* Left panel width = (available height) × 9/16.
                250px = header(56) + footer(100) + py-5×2(40) + nav(36) + gap(12) + buffer */}
            <div className="flex-1 flex gap-5 px-6 py-5 min-h-0 items-stretch">

              {/* ── LEFT: Video ──────────────────────────────────────────── */}
              <div
                className="shrink-0 flex flex-col items-center gap-3"
                style={{ width: "calc((100vh - 250px) * 9 / 16)" }}
              >
                {/* Shot navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={selectedIdx === 0}
                    onClick={() => setSelectedIdx((i) => i - 1)}
                    className="text-white/50 hover:text-white hover:bg-white/5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-white/50 text-sm tabular-nums">
                    Shot {selectedIdx + 1} / {shots.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={selectedIdx === shots.length - 1}
                    onClick={() => setSelectedIdx((i) => i + 1)}
                    className="text-white/50 hover:text-white hover:bg-white/5"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Video player — always 9:16 (vertical/reels) */}
                <div className="relative bg-black/60 rounded-xl overflow-hidden border border-white/10 flex-1 w-full">
                  {currentShot?.currentUuid ? (
                    <AmplifyVideo
                      key={currentShot.currentUuid}
                      mediaId={currentShot.currentUuid}
                      mode="click-play"
                      loop
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                      No video
                    </div>
                  )}

                  {/* Regenerating overlay */}
                  {isRegenerating && (
                    <div className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
                        <span className="text-orange-400/80 text-xs">Regenerating…</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT: Prompt box ────────────────────────────────────── */}
              <div className="flex flex-col flex-1 min-w-0 min-h-0">
                <label className="text-[11px] text-white/40 uppercase tracking-wide mb-2 shrink-0">
                  Veo Prompt
                </label>

                <div className="flex-1 flex flex-col rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden min-h-0">
                  <Textarea
                    className="flex-1 min-h-0 resize-none border-0 shadow-none rounded-none bg-transparent p-4 text-white/80 text-sm placeholder:text-white/20 leading-relaxed focus-visible:ring-0 focus-visible:border-0 disabled:opacity-50"
                    value={currentShot?.prompt ?? ""}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    disabled={isRegenerating}
                    placeholder="Enter Veo prompt…"
                  />

                  {/* Gen params + frame cards */}
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-t border-white/10 shrink-0">
                    <span className="px-2 py-1 rounded-md bg-white/[0.06] border border-white/10 text-[11px] text-white/50">
                      {currentShot?.aspectRatio ?? "—"}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-white/[0.06] border border-white/10 text-[11px] text-white/50">
                      {currentShot?.resolution ?? "—"}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-white/[0.06] border border-white/10 text-[11px] text-white/50">
                      {currentShot?.duration ?? "—"}s
                    </span>

                    {currentShot?.firstFrameUuid && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/30">first</span>
                        <div className="relative w-8 h-8 rounded-md overflow-hidden border border-white/10 shrink-0">
                          <AmplifyImage
                            mediaId={currentShot.firstFrameUuid}
                            variant="Tiny"
                            lightbox
                            alt="First frame"
                            sizes="32px"
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {currentShot?.lastFrameUuid && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/30">last</span>
                        <div className="relative w-8 h-8 rounded-md overflow-hidden border border-white/10 shrink-0">
                          <AmplifyImage
                            mediaId={currentShot.lastFrameUuid}
                            variant="Tiny"
                            lightbox
                            alt="Last frame"
                            sizes="32px"
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom bar: model + regen */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-t border-white/10 bg-white/[0.02] shrink-0">
                    {/* Model selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isRegenerating}
                          className="text-white/60 bg-white/[0.06] border-white/10 hover:bg-white/10 hover:text-white text-xs h-7"
                        >
                          {currentModel.label}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="top" align="start" className="min-w-[160px]">
                        {VEO_MODELS.map((m) => (
                          <DropdownMenuItem
                            key={m.value}
                            onClick={() => handleModelChange(m.value)}
                            className={cn(
                              currentShot?.model === m.value && "text-orange-400"
                            )}
                          >
                            {m.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Regenerate */}
                    <Button
                      size="icon"
                      disabled={isRegenerating}
                      onClick={handleRegenerate}
                      title="Regenerate this shot with current prompt"
                      className="rounded-full bg-orange-500 hover:bg-orange-400 text-white"
                    >
                      {isRegenerating
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <RefreshCw className="w-4 h-4" />
                      }
                    </Button>
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
                        "relative shrink-0 rounded-lg overflow-hidden border-2 transition-all bg-black/40",
                        isSelected
                          ? "border-orange-500 shadow-[0_0_0_1px_#f9731680]"
                          : "border-white/10 hover:border-white/25"
                      )}
                      style={{ width: 52, aspectRatio: "9/16" }}
                    >
                      <AmplifyVideo mediaId={shot.currentUuid} mode="hover-play" />
                      <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none">
                        <span className="text-[10px] font-semibold text-white bg-black/60 rounded px-1 leading-snug self-start">
                          {i + 1}
                        </span>
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

              {error && (
                <p className="text-red-400 text-xs shrink-0">{error}</p>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !taskId || shots.some((s) => s.regenStatus === "regenerating")}
                className="shrink-0 bg-orange-500 text-white hover:bg-orange-400"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check />}
                {isSubmitting ? "Submitting…" : "Approve & Continue"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
