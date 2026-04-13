"use client";

// =============================================================================
// WorkflowLibrary — premium horizontal carousel using /v1/library-templates/
// =============================================================================

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  Sparkles,
  Zap,
  GitBranch,
  ArrowRight,
  Calendar,
  ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useLibraryTemplates,
  type LibraryTemplate,
} from "@/features/templates/hooks/useLibraryTemplates";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_W = 200; // px
const CARD_H = 130; // px
const GAP    = 12;  // px

const PALETTES: [string, string, string][] = [
  ["#7c3aed", "#4f46e5", "#1e1b4b"],
  ["#db2777", "#9333ea", "#3b0764"],
  ["#ea580c", "#dc2626", "#450a0a"],
  ["#0891b2", "#0284c7", "#0c1445"],
  ["#059669", "#0d9488", "#052e16"],
  ["#d97706", "#b45309", "#1c0a00"],
  ["#2563eb", "#4f46e5", "#0f0a3c"],
  ["#be185d", "#9333ea", "#2d0036"],
];

function palette(id: string): [string, string, string] {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTES[hash % PALETTES.length];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// WorkflowCard
// ---------------------------------------------------------------------------

function WorkflowCard({
  template,
  index,
  onClick,
}: {
  template: LibraryTemplate;
  index: number;
  onClick: (t: LibraryTemplate) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered]   = useState(false);
  const [imgError, setImgError] = useState(false);

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
  const hasThumbnail = !!template.thumbnail_url && !imgError;
  const nodeCount = Object.keys(template.graph_json ?? {}).length;

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
      {/* ── Background: thumbnail OR gradient ── */}
      {hasThumbnail ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={template.thumbnail_url!}
            alt=""
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
          {/* Darkening overlay so text is always readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 40%, ${c0}cc, ${c1}99 50%, ${c2} 100%)`,
            }}
          />
          {/* Ambient orb */}
          <motion.div
            animate={hovered ? { scale: 1.6, opacity: 0.35 } : { scale: 1, opacity: 0.15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl"
            style={{ background: c0 }}
          />
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`grid-${template.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${template.id})`} />
          </svg>
        </>
      )}

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
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
              width: "60%",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Top-right: icon ── */}
      <div className="absolute top-2.5 right-2.5 opacity-25">
        <GitBranch className="w-3.5 h-3.5 text-white" />
      </div>

      {/* ── Top-left: node count pill (only when no thumbnail) ── */}
      {!hasThumbnail && nodeCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-2.5 left-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10"
        >
          <Sparkles className="w-2.5 h-2.5 text-white/60" />
          <span className="text-white/60 text-[9px] font-mono">{nodeCount} nodes</span>
        </motion.div>
      )}

      {/* ── Bottom info ── */}
      <div className="absolute bottom-0 inset-x-0 px-3 pb-2.5 pt-8 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
        <p className="text-white text-[12px] font-semibold leading-snug truncate text-left">
          {template.name}
        </p>

        {/* Meta row: description or date */}
        <div className="flex items-center justify-between mt-0.5 gap-1">
          {template.description ? (
            <p className="text-white/40 text-[9px] truncate text-left flex-1 leading-tight">
              {template.description}
            </p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-0.5 text-white/25 text-[8px] shrink-0">
            <Calendar className="w-2 h-2" />
            {formatDate(template.created_at)}
          </div>
        </div>
      </div>

      {/* ── Hover CTA ── */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium">
              <Zap className="w-3 h-3" />
              Preview workflow
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Border glow ── */}
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
// Skeleton
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
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)",
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
      <ImageOff className="w-6 h-6 text-white/10" />
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
  className?: string;
}

export function WorkflowLibrary({ projectId, className }: WorkflowLibraryProps) {
  const router    = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { templates, isLoading } = useLibraryTemplates(50);

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

  const handleCardClick = useCallback((t: LibraryTemplate) => {
    // Open the global library template in read-only preview mode
    router.push(`/projects/${projectId}/library-templates/${t.id}?readonly=1`);
  }, [projectId, router]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Icon with pulse ring */}
          <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center shrink-0">
            <LayoutTemplate className="w-3.5 h-3.5 text-violet-300" />
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

        {/* Scroll controls */}
        <div className="flex items-center gap-1">
          {[
            { dir: "left"  as const, can: canLeft,  Icon: ChevronLeft,  label: "Scroll left"  },
            { dir: "right" as const, can: canRight, Icon: ChevronRight, label: "Scroll right" },
          ].map(({ dir, can, Icon, label }) => (
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
        {/* Left / right edge fades */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"
          animate={{ opacity: canLeft ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"
          animate={{ opacity: canRight ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />

        <div
          ref={scrollRef}
          onScroll={syncArrows}
          className="flex overflow-x-auto pb-2"
          style={{ gap: GAP, scrollbarWidth: "none", msOverflowStyle: "none" }}
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
          Click a workflow to preview, then duplicate it to your project
        </motion.p>
      )}
    </div>
  );
}
