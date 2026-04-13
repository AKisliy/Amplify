"use client";

import { useState } from "react";
import { Check, CalendarDays, PanelRightClose, PanelRightOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAutolists } from "@/features/autolists/hooks/useAutolists";

const SIDEBAR_WIDTH = 240;
const ICON_STRIP_WIDTH = 48;

interface TemplateSettingsSidebarProps {
  projectId: string;
  autoListIds: string[];
  onAutoListIdsChange: (ids: string[]) => void;
}

export function TemplateSettingsSidebar({
  projectId,
  autoListIds,
  onAutoListIdsChange,
}: TemplateSettingsSidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const { autolists, isLoading } = useAutolists(projectId);

  const toggle = (id: string) => {
    const next = autoListIds.includes(id)
      ? autoListIds.filter((x) => x !== id)
      : [...autoListIds, id];
    onAutoListIdsChange(next);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <motion.aside
        animate={{ width: expanded ? SIDEBAR_WIDTH : ICON_STRIP_WIDTH }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="shrink-0 border-l border-border/40 bg-card/20 text-sidebar-foreground flex flex-col overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {/* Header: toggle button */}
        <div className="h-10 flex items-center border-b border-sidebar-border shrink-0 px-1.5">
          <IconButton
            onClick={() => setExpanded((v) => !v)}
            tooltip={expanded ? "Collapse" : "Expand"}
            tooltipSide="left"
          >
            {expanded
              ? <PanelRightClose className="size-4" />
              : <PanelRightOpen className="size-4" />
            }
          </IconButton>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="ml-2 text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide whitespace-nowrap overflow-hidden"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Auto-publish section */}
        <div className="flex flex-col py-1">
          {/* Section row: icon always visible, label only when expanded */}
          <div className="flex items-center px-1.5 py-1 gap-2">
            <IconButton
              onClick={() => setExpanded(true)}
              tooltip="Auto-publish"
              tooltipSide="left"
              active={autoListIds.length > 0}
            >
              <CalendarDays className="size-4" />
            </IconButton>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-xs font-medium text-sidebar-foreground whitespace-nowrap overflow-hidden"
                >
                  Auto-publish
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Autolist checkboxes — only when expanded */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-2 mt-0.5"
              >
                {isLoading && (
                  <p className="px-2 py-1.5 text-xs text-sidebar-foreground/40">Loading…</p>
                )}
                {!isLoading && autolists.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-sidebar-foreground/40">No AutoLists found</p>
                )}
                {autolists.map((al) => {
                  const selected = autoListIds.includes(al.id);
                  return (
                    <button
                      key={al.id}
                      onClick={() => toggle(al.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-left transition-colors",
                        "hover:bg-sidebar-accent",
                        selected ? "text-sidebar-foreground" : "text-sidebar-foreground/60"
                      )}
                    >
                      <span
                        className={cn(
                          "w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center",
                          selected ? "bg-primary border-primary" : "border-sidebar-foreground/20"
                        )}
                      >
                        {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </span>
                      <span className="truncate">{al.name}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// IconButton — square icon button with tooltip
// ---------------------------------------------------------------------------

interface IconButtonProps {
  onClick: () => void;
  tooltip: string;
  tooltipSide?: "left" | "right" | "top" | "bottom";
  active?: boolean;
  children: React.ReactNode;
}

function IconButton({ onClick, tooltip, tooltipSide = "left", active, children }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-md shrink-0 transition-colors",
            "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground",
            active && "text-sidebar-foreground"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
