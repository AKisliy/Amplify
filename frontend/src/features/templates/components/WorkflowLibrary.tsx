"use client";

// =============================================================================
// WorkflowLibrary — grid layout matching the Templates section
// =============================================================================

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
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
import {
  SectionContainer,
  SectionHeader,
  SectionGrid,
  SectionEmptyState,
  SectionSkeletonGrid,
} from "@/components/SectionLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
// WorkflowCard — matches template card style exactly
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
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered]   = useState(false);
  const [imgError, setImgError] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    setHovered(false);
  }, [rawX, rawY]);

  const [c0, c1, c2] = palette(template.id);
  const hasThumbnail = !!template.thumbnail_url && !imgError;
  const nodeCount = Object.keys(template.graph_json ?? {}).length;

  return (
    <motion.div
      key={template.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.055 }}
      className="relative group/card"
    >
      <Card
        className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group border-border/50 h-full"
        onClick={() => onClick(template)}
      >
        {/* Thumbnail / Cover area — same aspect-video as templates */}
        <div
          ref={ref}
          className="relative w-full aspect-video rounded-t-lg overflow-hidden"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={onMouseLeave}
        >
          {hasThumbnail ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={template.thumbnail_url!}
                alt={template.name}
                onError={() => setImgError(true)}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <>
              {/* Gradient placeholder matching library aesthetic */}
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
                className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl"
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
              {/* Centre icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <LayoutTemplate className="w-10 h-10 text-white/20 group-hover:text-white/30 transition-colors" />
              </div>
            </>
          )}

          {/* Node count pill */}
          {nodeCount > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
              <Sparkles className="w-2.5 h-2.5 text-white/60" />
              <span className="text-white/60 text-[9px] font-mono">{nodeCount} nodes</span>
            </div>
          )}

          {/* Top-right icon */}
          <div className="absolute top-2 right-2 opacity-25">
            <GitBranch className="w-3.5 h-3.5 text-white" />
          </div>

          {/* Shimmer on hover */}
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

          {/* Hover CTA */}
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
        </div>

        {/* Card text body — identical structure to template cards */}
        <CardHeader className="pt-3 pb-2 px-4">
          <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors">
            {template.name}
          </CardTitle>
          {template.description && (
            <CardDescription className="text-xs line-clamp-2 mt-1">
              {template.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="px-4 pb-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
            <Calendar className="w-3 h-3" />
            {formatDate(template.created_at)}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowLibrary
// ---------------------------------------------------------------------------

export interface WorkflowLibraryProps {
  projectId: string;
  className?: string;
}

export function WorkflowLibrary({ projectId, className }: WorkflowLibraryProps) {
  const router = useRouter();
  const { templates, isLoading } = useLibraryTemplates(50);

  const handleCardClick = useCallback((t: LibraryTemplate) => {
    router.push(`/projects/${projectId}/library-templates/${t.id}?readonly=1`);
  }, [projectId, router]);

  return (
    <SectionContainer className={className}>
      <SectionHeader
        title="Workflow Library"
        description={
          isLoading
            ? "Loading…"
            : `${templates.length} template${templates.length !== 1 ? "s" : ""} available`
        }
        action={
          !isLoading && templates.length > 0 ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground select-none">
              <ArrowRight className="w-3 h-3" />
              Click a workflow to preview, then duplicate it to your project
            </p>
          ) : undefined
        }
      />

      {isLoading ? (
        <SectionSkeletonGrid count={4} />
      ) : templates.length === 0 ? (
        <SectionEmptyState
          icon={<ImageOff className="w-14 h-14" />}
          title="No Workflow Templates Yet"
          description="Global workflow templates will appear here once added."
        />
      ) : (
        <SectionGrid>
          {templates.map((t, i) => (
            <WorkflowCard
              key={t.id}
              template={t}
              index={i}
              onClick={handleCardClick}
            />
          ))}
        </SectionGrid>
      )}
    </SectionContainer>
  );
}
