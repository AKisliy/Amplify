"use client";

// =============================================================================
// NodeContextMenu — Right-click menu for individual canvas nodes.
// Shows "Delete Node" option. Clamps to viewport, closes on outside click / Escape.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeContextMenuProps {
  position: { x: number; y: number } | null;
  onDelete: () => void;
  onClose: () => void;
}

export function NodeContextMenu({ position, onDelete, onClose }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);

  // Clamp to viewport after render
  useEffect(() => {
    if (!position || !menuRef.current) {
      setAdjustedPos(position);
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    const x = position.x + rect.width  > window.innerWidth  ? position.x - rect.width  : position.x;
    const y = position.y + rect.height > window.innerHeight ? position.y - rect.height : position.y;
    setAdjustedPos({ x: Math.max(4, x), y: Math.max(4, y) });
  }, [position]);

  // Close on outside click
  useEffect(() => {
    if (!position) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [position, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!position) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
            zIndex: 1001,
            transformOrigin: "top left",
          }}
          className={cn(
            "w-40 rounded-xl overflow-hidden py-1.5",
            "bg-[oklch(0.12_0.03_264/0.96)] backdrop-blur-md",
            "border border-white/[0.09]",
            "shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
          )}
        >
          <p className="px-3 pb-1 text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
            Node
          </p>
          <button
            onClick={() => { onDelete(); onClose(); }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5",
              "text-[12px] text-red-400/80 hover:text-red-400",
              "hover:bg-red-500/[0.12] transition-colors duration-100"
            )}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            Delete Node
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
