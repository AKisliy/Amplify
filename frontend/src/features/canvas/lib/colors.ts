// =============================================================================
// Canvas colour palette — single source of truth.
//
// These values are mirrored as Tailwind tokens in globals.css @theme inline
// (e.g. bg-canvas-image, text-canvas-text) for use in className strings.
// Use the constants below only where a raw hex string is required (inline
// styles, SVG attributes, box-shadow composition, etc.).
// =============================================================================

import type { NodeCategory, NodePortType, NodeInputPrimitive } from "../types";

/** Accent colour per node category */
export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  text:    "#a855f7", // purple-500  → --color-canvas-text
  image:   "#ec4899", // pink-500    → --color-canvas-image
  video:   "#ef4444", // red-500     → --color-canvas-video
  utility: "#64748b", // slate-500   → --color-canvas-utility
  manual:  "#f97316", // orange-500  → --color-canvas-manual
};

/** Colour per port / primitive data type */
export const PORT_COLORS: Record<NodePortType | NodeInputPrimitive, string> = {
  STRING:            "#a855f7", // purple-500  → --color-canvas-string
  INT:               "#22c55e", // green-500   → --color-canvas-int
  FLOAT:             "#06b6d4", // cyan-500    → --color-canvas-float
  BOOLEAN:           "#eab308", // yellow-500  → --color-canvas-boolean
  COMBO:             "#f97316", // orange-500  → --color-canvas-combo
  IMAGE:             "#ec4899", // pink-500    → --color-canvas-image
  VIDEO:             "#ef4444", // red-500     → --color-canvas-video
  COMFY_AUTOGROW_V3: "#3b82f6", // blue-500   → --color-canvas-autogrow
};

export const PORT_COLOR_FALLBACK = "#94a3b8"; // slate-400 → --color-canvas-unknown
