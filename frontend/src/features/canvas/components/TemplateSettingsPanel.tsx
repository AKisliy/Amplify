"use client";

import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAutolists } from "@/features/autolists/hooks/useAutolists";

interface TemplateSettingsPanelProps {
  isOpen: boolean;
  projectId: string;
  autoListIds: string[];
  onAutoListIdsChange: (ids: string[]) => void;
}

export function TemplateSettingsPanel({
  isOpen,
  projectId,
  autoListIds,
  onAutoListIdsChange,
}: TemplateSettingsPanelProps) {
  const { autolists, isLoading } = useAutolists(projectId);

  const toggle = (id: string) => {
    const next = autoListIds.includes(id)
      ? autoListIds.filter((x) => x !== id)
      : [...autoListIds, id];
    onAutoListIdsChange(next);
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.aside
          key="settings-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="shrink-0 border-l border-border/40 bg-card/30 flex flex-col overflow-hidden"
        >
          <div className="px-3 py-2.5 border-b border-border/30 shrink-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Auto-publish
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {isLoading && (
              <p className="px-3 py-2 text-xs text-muted-foreground/50">Loading…</p>
            )}
            {!isLoading && autolists.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground/50">No AutoLists found</p>
            )}
            {autolists.map((al) => {
              const selected = autoListIds.includes(al.id);
              return (
                <button
                  key={al.id}
                  onClick={() => toggle(al.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors",
                    "hover:bg-white/[0.04]",
                    selected ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center",
                      selected
                        ? "bg-primary border-primary"
                        : "border-white/20 bg-transparent"
                    )}
                  >
                    {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </span>
                  <span className="truncate">{al.name}</span>
                </button>
              );
            })}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
