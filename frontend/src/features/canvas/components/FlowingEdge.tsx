"use client";

// =============================================================================
// FlowingEdge — Premium StatusEdge with animated flowing dots.
//
// States:
//   idle        → solid bezier, subtle grey
//   flowing     → animated dashes moving along the path (CSS animation)
//   error       → red stroke
//   selected    → primary accent colour, thicker
// =============================================================================

import {
  type Edge,
  type EdgeProps,
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
} from "@xyflow/react";
import type { CSSProperties } from "react";

export type FlowingEdgeData = {
  flowing?: boolean;
  error?: boolean;
};

export type FlowingEdgeType = Edge<FlowingEdgeData, "status">;

// Animation keyframes injected once as a <style> tag
const KEYFRAMES = `
@keyframes flow-dash {
  from { stroke-dashoffset: 24; }
  to   { stroke-dashoffset: 0;  }
}
`;

let _keyframesInjected = false;
function ensureKeyframes() {
  if (_keyframesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  _keyframesInjected = true;
}

export function FlowingEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<FlowingEdgeType>) {
  ensureKeyframes();

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isFlowing = data?.flowing ?? false;
  const isError   = data?.error   ?? false;

  // ── stroke colour ──────────────────────────────────────────────────────────
  let strokeColor: string;
  if (isError)         strokeColor = "#ef4444";
  else if (selected)   strokeColor = "#a855f7";
  else if (isFlowing)  strokeColor = "#6366f1";
  else                 strokeColor = "rgba(255,255,255,0.12)";

  // ── base path style ────────────────────────────────────────────────────────
  const baseStyle: CSSProperties = {
    stroke: strokeColor,
    strokeWidth: selected ? 2.5 : 1.5,
    transition: "stroke 0.2s ease, stroke-width 0.2s ease",
    fill: "none",
  };

  // ── animated overlay (flowing dots) ────────────────────────────────────────
  const flowStyle: CSSProperties = {
    stroke: "#a5b4fc",
    strokeWidth: 2,
    strokeDasharray: "6 8",
    strokeDashoffset: 0,
    animation: "flow-dash 0.6s linear infinite",
    fill: "none",
    opacity: 0.9,
  };

  return (
    <>
      {/* Wide invisible hit area — makes the edge easy to click/select */}
      <path
        d={edgePath}
        style={{
          stroke: "transparent",
          strokeWidth: 20,
          fill: "none",
          cursor: "pointer",
        }}
      />

      {/* Base path — always rendered */}
      <BaseEdge path={edgePath} style={baseStyle} />

      {/* Flowing animation overlay — only when active */}
      {isFlowing && (
        <path d={edgePath} style={flowStyle} />
      )}

      {/* Error indicator dot at midpoint */}
      {isError && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
              pointerEvents: "none",
            }}
            className="w-3 h-3 rounded-full bg-red-500 border border-red-300/30 shadow-[0_0_8px_#ef4444]"
          />
        </EdgeLabelRenderer>
      )}
    </>
  );
}
