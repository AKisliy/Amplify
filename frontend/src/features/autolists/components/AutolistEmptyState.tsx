"use client";

import { motion } from "framer-motion";
import { ListIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AutolistEmptyStateProps {
  onCreateClick: () => void;
}

export function AutolistEmptyState({ onCreateClick }: AutolistEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 shadow-inner">
        <ListIcon className="w-10 h-10 text-primary/60" />
      </div>
      <h3 className="text-2xl font-semibold mb-2 text-foreground">
        No Autolists Yet
      </h3>
      <p className="text-muted-foreground text-center mb-8 max-w-md leading-relaxed">
        Autolists help you schedule and automate your content publishing.
        Create your first autolist to get started.
      </p>
      <Button onClick={onCreateClick} size="lg" className="gap-2 shadow-md">
        <Plus className="w-4 h-4" />
        Create Autolist
      </Button>
    </motion.div>
  );
}
