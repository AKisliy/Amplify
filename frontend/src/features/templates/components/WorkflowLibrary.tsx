"use client";

// =============================================================================
// WorkflowLibrary — premium horizontal workflow carousel
// =============================================================================

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  Loader2,
  Sparkles,
  Zap,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalTemplates } from "@/features/templates/hooks/useGlobalTemplates";
import type { ProjectTemplateResponse } from "@/lib/api/generated/template-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_W = 192; // px
const CARD_H = 120; // px
const GAP     = 12;  // px

const PALETTES: [string, string, string][] = [
  ["#7c3aed", "#4f46e5", "#1e1b4b"], // violet → indigo
  ["#db2777", "#9333ea", "#3b0764"], // pink → purple
  ["#ea580c", "#dc2626", "#450a0a"], // orange → red
  ["#0891b2", "#0284c7", "#0c1445"], // cyan → blue
  ["#059669", "#0d9488", "#052e16"], // emerald → teal
  ["#d97706", "#b45309", "#1c0a00"], // amber → brown
  ["#2563eb", "#4f46e5", "#0f0a3c"], // blue → indigo
  ["#be185d", "#9333ea", "#2d0036"], // rose → violet
];

function palette(id: string): [string, string, string] {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTES[hash % PALETTES.length];
}

// ---------------------------------------------------------------------------
// MagneticCard — 3-D tilt on hover with framer spring
// ---------------------------------------------------------------------------

function WorkflowCard({
  template,
  index,
  onClick,
}: {
  template: ProjectTemplateResponse;
  index: number;
  onClick: (t: ProjectTemplateResponse) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [rawX, rawY]);

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    setHovered(false);
  }, [rawX, rawY]);

  const [c0, c1, c2] = palette(template.id);

  const nodeCount =
    template.current_graph_json &&
    typeof template.current_graph_json === "object"
      ? Object.keys(template.current_graph_json).length
      : 0;

  return (
    <motion.button
      ref={ref}
      id={`wf-card-${template.id}`}
      aria-label={`Open workflow: ${template.name}`}
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.05 + index * 0.055,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 800,
        width: CARD_W,
        height: CARD_H,
        flexShrink: 0,
      }}
      whileTap={{ scale: 0.96 }}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick(template)}
      className="relative rounded-2xl overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {/* ── Gradient base ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 30% 40%, ${c0}cc, ${c1}99 50%, ${c2} 100%)`,
        }}
      />

      {/* ── Animated orb ── */}
      <motion.div
        animate={hovered ? { scale: 1.6, opacity: 0.35 } : { scale: 1, opacity: 0.15 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl"
        style={{ background: c0 }}
      />

      {/* ── Grid lines (subtle) ── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.06]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={`grid-${template.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${template.id})`} />
      </svg>

      {/* ── Shimmer sweep on hover ── */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ x: "-130%", skewX: -15 }}
            animate={{ x: "130%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.14) 50%, transparent 100%)",
              width: "60%",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Top-right: icon ── */}
      <div className="absolute top-3 right-3 opacity-20">
        <GitBranch className="w-4 h-4 text-white" />
      </div>

      {/* ── Top-left: node count pill ── */}
      {nodeCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-3 left-3 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10"
        >
          <Sparkles className="w-2.5 h-2.5 text-white/60" />
          <span className="text-white/60 text-[9px] font-mono">{nodeCount} nodes</span>
        </motion.div>
      )}

      {/* ── Bottom info ── */}
      <div className="absolute bottom-0 inset-x-0 px-3 pb-3 pt-8 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
        <p className="text-white text-[12px] font-semibold leading-snug truncate text-left">
          {template.name}
        </p>
        {template.description && (
          <p className="text-white/40 text-[9px] truncate text-left mt-0.5 leading-tight">
            {template.description}
          </p>
        )}
      </div>

      {/* ── Hover: "Open" pill ── */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium">
              <Zap className="w-3 h-3" />
              Open workflow
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Border glow on hover ── */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={
          hovered
            ? { boxShadow: `0 0 0 1.5px ${c0}88, 0 8px 32px ${c0}44` }
            : { boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }
        }
        transition={{ duration: 0.2 }}
      />
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      style={{ width: CARD_W, height: CARD_H, flexShrink: 0 }}
      className="rounded-2xl bg-white/[0.04] border border-white/[0.06] relative overflow-hidden"
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)",
          animationDelay: `${index * 0.12}s`,
        }}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ width: CARD_W * 2, height: CARD_H, flexShrink: 0 }}
      className="rounded-2xl border border-dashed border-white/[0.08] flex flex-col items-center justify-center gap-2"
    >
      <LayoutTemplate className="w-6 h-6 text-white/10" />
      <p className="text-white/15 text-[11px]">No workflow templates yet</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowLibrary
// ---------------------------------------------------------------------------

export interface WorkflowLibraryProps {
  /** Project whose canvas the readonly preview will open under */
  projectId: string;
  onTemplateClick?: (template: ProjectTemplateResponse) => void;
  className?: string;
}

export function WorkflowLibrary({ projectId, onTemplateClick, className }: WorkflowLibraryProps) {
  const router   = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { templates, isLoading } = useGlobalTemplates(40);

  const handleCardClick = useCallback((t: ProjectTemplateResponse) => {
    onTemplateClick?.(t);
    router.push(`/projects/${projectId}/templates/${t.id}?readonly=1&src=${t.id}`);
  }, [projectId, router, onTemplateClick]);

  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(true);

  const syncArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    syncArrows();
  }, [templates, syncArrows]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -(CARD_W + GAP) * 3 : (CARD_W + GAP) * 3,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Icon */}
          <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center shrink-0">
            <LayoutTemplate className="w-3.5 h-3.5 text-violet-300" />
            {/* pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-lg border border-violet-400/30"
              animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/80 leading-none tracking-tight">
              Workflow Library
            </h3>
            <p className="text-[10px] text-white/25 mt-0.5 leading-none">
              {isLoading ? "Loading…" : `${templates.length} templates available`}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {[
            { dir: "left" as const, can: canLeft,  icon: ChevronLeft,  label: "Scroll left"  },
            { dir: "right" as const, can: canRight, icon: ChevronRight, label: "Scroll right" },
          ].map(({ dir, can, icon: Icon, label }) => (
            <motion.button
              key={dir}
              id={`wf-scroll-${dir}`}
              aria-label={label}
              disabled={!can}
              onClick={() => scroll(dir)}
              whileHover={can ? { scale: 1.1 } : {}}
              whileTap={can ? { scale: 0.92 } : {}}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center border transition-colors duration-150",
                can
                  ? "border-white/10 text-white/45 hover:text-white hover:border-white/20 hover:bg-white/[0.06]"
                  : "border-white/[0.04] text-white/12 cursor-not-allowed"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Scrollable strip ── */}
      <div className="relative">
        {/* Left fade */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"
          animate={{ opacity: canLeft ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
        {/* Right fade */}
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"
          animate={{ opacity: canRight ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Cards */}
        <div
          ref={scrollRef}
          onScroll={syncArrows}
          className="flex overflow-x-auto pb-2"
          style={{
            gap: GAP,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} index={i} />)
            : templates.length === 0
            ? <EmptyState />
            : templates.map((t, i) => (
                <WorkflowCard
                  key={t.id}
                  template={t}
                  index={i}
                  onClick={handleCardClick}
                />
              ))}
        </div>
      </div>

      {/* ── Bottom hint ── */}
      {!isLoading && templates.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-1 text-[10px] text-white/15 select-none"
        >
          <ArrowRight className="w-2.5 h-2.5" />
          Click a workflow to open it in the canvas editor
        </motion.p>
      )}
    </div>
  );
}
