"use client";

// =============================================================================
// TemplateMenu — Right-click menu on the template name in the sub-header.
// Options: Save, Rename.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  updateTemplateV1TemplatesTemplateIdPatch,
} from "@/lib/api/template-service";
import type { CanvasNode, CanvasEdge } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TemplateMenuProps {
  position: { x: number; y: number } | null;
  templateId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onRename: (name: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplateMenu({
  position,
  templateId,
  nodes,
  edges,
  onRename,
  onClose,
}: TemplateMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Rename inline state
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

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
  }, [position, renaming]);

  // Close on outside click
  useEffect(() => {
    if (!position) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [position, onClose]);

  // Close on Escape (unless renaming)
  useEffect(() => {
    if (!position) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (renaming) setRenaming(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [position, onClose, renaming]);

  // Focus rename input when it opens
  useEffect(() => {
    if (renaming) setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [renaming]);

  // Save graph handler
  const handleSave = async () => {
    try {
      // Save to localStorage
      const localStorageKey = `template-canvas-${templateId}`;
      localStorage.setItem(localStorageKey, JSON.stringify({ nodes, edges }));
      console.log("Saved to localStorage:", localStorageKey);

      // Also try to save to backend
      const payload = {
        path: { template_id: templateId },
        body: {
          current_graph_json: { nodes: nodes as unknown[], edges: edges as unknown[] },
        },
      };
      console.log("Saving template with payload:", payload);
      const response = await updateTemplateV1TemplatesTemplateIdPatch(payload);
      console.log("Save response:", response);
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 1800);
    } catch (err) {
      console.error("Failed to save template to backend:", err);
      // silent fail — backend may not be ready, but localStorage is saved
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 1800);
    }
  };

  // Rename confirm handler
  const handleRenameConfirm = async () => {
    const name = renameValue.trim();
    if (!name) return;
    try {
      await updateTemplateV1TemplatesTemplateIdPatch({
        path: { template_id: templateId },
        body: { name },
      });
      onRename(name);
    } catch {
      // silent fail
    }
    setRenaming(false);
    onClose();
  };

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
            zIndex: 1002,
            transformOrigin: "top left",
          }}
          className={cn(
            "w-44 rounded-xl overflow-hidden py-1.5",
            "bg-[oklch(0.12_0.03_264/0.96)] backdrop-blur-md",
            "border border-white/[0.09]",
            "shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
          )}
        >
          <p className="px-3 pb-1 text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
            Template
          </p>

          {/* Save */}
          <button
            onClick={handleSave}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5",
              "text-[12px] text-white/70 hover:text-white/95",
              "hover:bg-white/[0.07] transition-colors duration-100"
            )}
          >
            {savedIndicator ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-green-400" />
            ) : (
              <Save className="w-3.5 h-3.5 shrink-0" />
            )}
            {savedIndicator ? "Saved!" : "Save"}
          </button>

          {/* Rename */}
          {renaming ? (
            <div className="px-2 py-1.5">
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameConfirm();
                  if (e.key === "Escape") setRenaming(false);
                }}
                placeholder="New name…"
                className={cn(
                  "w-full rounded-md px-2 py-1 text-[12px]",
                  "bg-white/[0.08] border border-white/[0.12]",
                  "text-white/80 placeholder:text-muted-foreground/30",
                  "outline-none focus:border-white/25"
                )}
              />
              <div className="flex gap-1 mt-1.5">
                <button
                  onClick={handleRenameConfirm}
                  disabled={!renameValue.trim()}
                  className="flex-1 text-[11px] py-0.5 rounded bg-white/[0.1] hover:bg-white/[0.16] text-white/70 transition-colors disabled:opacity-40"
                >
                  OK
                </button>
                <button
                  onClick={() => setRenaming(false)}
                  className="flex-1 text-[11px] py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-white/40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setRenaming(true)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5",
                "text-[12px] text-white/70 hover:text-white/95",
                "hover:bg-white/[0.07] transition-colors duration-100"
              )}
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              Rename
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
