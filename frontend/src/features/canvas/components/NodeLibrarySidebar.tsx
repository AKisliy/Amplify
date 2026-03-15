"use client";

// =============================================================================
// NodeLibrarySidebar — Collapsible left panel with searchable, draggable nodes.
//
// Usage:
//   • Drag a card onto the ReactFlow canvas to place the node.
//   • The canvas's onDrop handler reads "application/amplify-node" from dataTransfer.
// =============================================================================

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bot,
  ImageIcon,
  VideoIcon,
  Wrench,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { NodeLibraryItem, NodeCategory } from "../types";

// ---------------------------------------------------------------------------
// Visual config
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<NodeCategory, React.FC<{ className?: string }>> = {
  text:    ({ className }) => <Bot       className={className} />,
  image:   ({ className }) => <ImageIcon className={className} />,
  video:   ({ className }) => <VideoIcon className={className} />,
  utility: ({ className }) => <Wrench    className={className} />,
};

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  text:    "#a855f7",
  image:   "#ec4899",
  video:   "#ef4444",
  utility: "#64748b",
};

const CATEGORY_ORDER: NodeCategory[] = ["text", "image", "video", "utility"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NodeLibrarySidebarProps {
  isOpen: boolean;
  nodesByCategory: Record<NodeCategory, NodeLibraryItem[]>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NodeLibrarySidebar({ isOpen, nodesByCategory }: NodeLibrarySidebarProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Partial<Record<NodeCategory, boolean>>>({});

  // Filter nodes by search query
  const filtered = useMemo<Record<NodeCategory, NodeLibraryItem[]>>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return nodesByCategory;
    const result = {} as Record<NodeCategory, NodeLibraryItem[]>;
    for (const cat of CATEGORY_ORDER) {
      result[cat] = (nodesByCategory[cat] ?? []).filter(
        (n) =>
          n.displayName.toLowerCase().includes(q) ||
          (n.description ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, nodesByCategory]);

  // When searching, auto-expand all categories
  const effectiveCollapsed = search.trim() ? {} : collapsed;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, schemaName: string) => {
    e.dataTransfer.setData("application/amplify-node", schemaName);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.aside
          key="node-library"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "border-r border-border/40 bg-card/20 backdrop-blur-sm",
            "flex flex-col h-full shrink-0 overflow-hidden"
          )}
        >
          {/* Search bar */}
          <div className="px-3 py-2.5 border-b border-border/30 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search nodes…"
                className={cn(
                  "pl-8 h-7 text-[12px]",
                  "bg-black/20 border-white/[0.06]",
                  "placeholder:text-muted-foreground/30",
                  "focus-visible:ring-1 focus-visible:ring-white/20"
                )}
              />
            </div>
          </div>

          {/* Node list */}
          <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
            {CATEGORY_ORDER.map((cat) => {
              const items = filtered[cat];
              if (!items?.length) return null;
              const Icon = CATEGORY_ICONS[cat];
              const color = CATEGORY_COLORS[cat];
              const isCollapsed = effectiveCollapsed[cat] ?? false;

              return (
                <div key={cat}>
                  {/* Category header */}
                  <button
                    onClick={() =>
                      setCollapsed((s) => ({ ...s, [cat]: !s[cat] }))
                    }
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5",
                      "hover:bg-white/[0.04] transition-colors",
                      "select-none"
                    )}
                  >
                    <span style={{ color: `${color}99` }} className="shrink-0 flex">
                      <Icon className="w-3 h-3" />
                    </span>
                    <span
                      className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: `${color}99` }}
                    >
                      {cat}
                    </span>
                    <span className="text-[10px] text-muted-foreground/30">
                      {items.length}
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-muted-foreground/30" />
                    )}
                  </button>

                  {/* Node cards */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        key={`${cat}-items`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-1">
                          {items.map((item) => (
                            <div
                              key={item.schemaName}
                              draggable
                              onDragStart={(e) => handleDragStart(e, item.schemaName)}
                              className={cn(
                                "group flex items-center gap-2 mx-2 px-2 py-1.5 rounded-lg mb-0.5",
                                "cursor-grab active:cursor-grabbing",
                                "hover:bg-white/[0.06] transition-colors"
                              )}
                            >
                              <GripVertical className="w-3 h-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0 transition-colors" />

                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-white/70 truncate group-hover:text-white/90 transition-colors leading-tight">
                                  {item.displayName}
                                </p>
                                {item.description && (
                                  <p className="text-[10px] text-muted-foreground/30 truncate leading-tight mt-0.5">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              {/* Category dot */}
                              <div
                                className="w-1.5 h-1.5 rounded-full shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                                style={{ background: color }}
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Empty state */}
            {CATEGORY_ORDER.every((cat) => !filtered[cat]?.length) && (
              <p className="px-4 py-6 text-center text-[12px] text-muted-foreground/30">
                No nodes match &ldquo;{search}&rdquo;
              </p>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
