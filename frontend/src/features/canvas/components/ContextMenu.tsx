"use client";

// =============================================================================
// ContextMenu — Right-click canvas context menu for adding nodes.
// Renders as a fixed-position floating panel at the cursor position.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ImageIcon, UserCheck, VideoIcon, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeLibraryItem, NodeCategory } from "../types";

// ---------------------------------------------------------------------------
// Visual config (mirrors AmplifyNode / NodePort palette)
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<NodeCategory, React.FC<{ className?: string }>> = {
  text:    ({ className }) => <Bot       className={className} />,
  image:   ({ className }) => <ImageIcon className={className} />,
  video:   ({ className }) => <VideoIcon className={className} />,
  utility: ({ className }) => <Wrench    className={className} />,
  manual:  ({ className }) => <UserCheck className={className} />,
};

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  text:    "#a855f7",
  image:   "#ec4899",
  video:   "#ef4444",
  utility: "#64748b",
  manual:  "#f97316",
};

const CATEGORY_ORDER: NodeCategory[] = ["text", "image", "video", "manual", "utility"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ContextMenuProps {
  /** Screen-space position (px) where the menu should appear */
  position: { x: number; y: number } | null;
  nodesByCategory: Record<NodeCategory, NodeLibraryItem[]>;
  onAddNode: (schemaName: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContextMenu({
  position,
  nodesByCategory,
  onAddNode,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  // Clamped position — adjusted so menu never overflows viewport
  const [adjustedPos, setAdjustedPos] = useState(position);

  useEffect(() => {
    if (!position || !menuRef.current) {
      setAdjustedPos(position);
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = position.x + rect.width  > vw ? position.x - rect.width  : position.x;
    const y = position.y + rect.height > vh ? position.y - rect.height : position.y;
    setAdjustedPos({ x: Math.max(4, x), y: Math.max(4, y) });
  }, [position]);

  // Close on outside click
  useEffect(() => {
    if (!position) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [position, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!position) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [position, onClose]);

  return (
    <AnimatePresence>
      {position && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.94, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -4 }}
          transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            left: adjustedPos?.x ?? position.x,
            top:  adjustedPos?.y ?? position.y,
            zIndex: 1000,
            transformOrigin: "top left",
          }}
          className={cn(
            "w-52 rounded-xl overflow-hidden",
            "bg-[oklch(0.12_0.03_264/0.96)] backdrop-blur-md",
            "border border-white/[0.09]",
            "shadow-[0_12px_40px_rgba(0,0,0,0.7)]",
            "py-1.5"
          )}
        >
          {/* Header label */}
          <p className="px-3 pb-1 text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
            Add Node
          </p>

          {CATEGORY_ORDER.map((cat) => {
            const items = nodesByCategory[cat];
            if (!items?.length) return null;
            const Icon = CATEGORY_ICONS[cat];
            const color = CATEGORY_COLORS[cat];

            return (
              <div key={cat} className="mb-1">
                {/* Category header */}
                <div
                  className="flex items-center gap-1.5 px-3 pt-1 pb-0.5"
                  style={{ color: `${color}80` }}
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {cat}
                  </span>
                </div>

                {/* Node items */}
                {items.map((item) => (
                  <button
                    key={item.schemaName}
                    onClick={() => {
                      onAddNode(item.schemaName);
                      onClose();
                    }}
                    className={cn(
                      "w-full text-left px-4 py-1.5",
                      "text-[12px] text-white/70 leading-tight",
                      "hover:bg-white/[0.07] hover:text-white/95",
                      "transition-colors duration-100"
                    )}
                  >
                    {item.displayName}
                  </button>
                ))}
              </div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
