"use client";

// =============================================================================
// AssetsPage — Time-grouped grid of all final generated assets
// =============================================================================

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ImageIcon,
  Video,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectAssets } from "@/features/ambassadors/hooks/useProjectAssets";
import type { ProjectAsset } from "@/features/ambassadors/types";
import { AmplifyImage } from "@/features/media/components/AmplifyImage";
import { AmplifyVideo } from "@/features/media/components/AmplifyVideo";

// ---------------------------------------------------------------------------
// Time-group helpers
// ---------------------------------------------------------------------------

function getGroup(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const week7Start = new Date(todayStart.getTime() - 6 * 86_400_000);
  const month30Start = new Date(todayStart.getTime() - 29 * 86_400_000);

  if (d >= todayStart) return "Today";
  if (d >= yesterdayStart) return "Yesterday";
  if (d >= week7Start) return "Previous 7 days";
  if (d >= month30Start) return "This month";
  return "Older";
}

const GROUP_ORDER = ["Today", "Yesterday", "Previous 7 days", "This month", "Older"];

function groupAssets(assets: ProjectAsset[]): { label: string; items: ProjectAsset[] }[] {
  const map = new Map<string, ProjectAsset[]>();
  for (const a of assets) {
    const g = getGroup(a.createdAt);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(a);
  }
  return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
    label: g,
    items: map.get(g)!,
  }));
}

// ---------------------------------------------------------------------------
// Asset card
// ---------------------------------------------------------------------------

function AssetCard({ asset, projectId }: { asset: ProjectAsset; projectId: string }) {
  const router = useRouter();
  const isVideo = asset.mediaType === "Video";

  const time = new Date(asset.createdAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => router.push(`/projects/${projectId}/assets/${asset.id}`)}
      className={cn(
        "group relative rounded-xl overflow-hidden cursor-pointer",
        "bg-[oklch(0.12_0.02_264)] border border-white/[0.07]",
        "hover:border-[#ec4899]/40 hover:shadow-[0_0_24px_rgba(236,72,153,0.08)]",
        "transition-all duration-200"
      )}
    >
      {/* Media */}
      <div className="aspect-video relative overflow-hidden bg-black/40">
        {isVideo ? (
          <AmplifyVideo
            src={asset.mediaUrl}
            mode="hover-play"
            className="transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <AmplifyImage
            mediaId={asset.mediaId}
            src={asset.mediaUrl}
            alt="Generated asset"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Type badge */}
        <div className={cn(
          "absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm",
          isVideo
            ? "bg-red-500/20 text-red-300 border border-red-500/30"
            : "bg-[#ec4899]/15 text-[#ec4899] border border-[#ec4899]/30"
        )}>
          {isVideo ? <Video className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
          {isVideo ? "Video" : "Image"}
        </div>

        {/* View arrow — appears on hover */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] font-mono text-white/30">{time}</span>
        {asset.mediaType === "Video" && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400/60 animate-[pulse_2s_ease-in-out_infinite]" />
            <span className="text-[9px] text-white/25">Video</span>
          </div>
        )}
      </div>
    </motion.article>
  );
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
      <span className="text-[10px] font-mono text-white/20 shrink-0">{count}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-video rounded-xl bg-white/[0.04] animate-pulse" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-5 text-center">
      <div className={cn(
        "w-20 h-20 rounded-2xl flex items-center justify-center",
        "bg-[#ec4899]/8 border border-[#ec4899]/20"
      )}>
        <Sparkles className="w-8 h-8 text-[#ec4899]/50" />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-white/70">No assets yet</p>
        <p className="text-sm text-white/30 max-w-xs leading-relaxed">
          Run a template to generate your first asset — it will appear here automatically.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AssetsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const { assets, isLoading, error, nextCursor, loadMore } = useProjectAssets(projectId);

  const groups = useMemo(() => groupAssets(assets), [assets]);
  const totalCount = assets.length;

  return (
    <div className="min-h-screen bg-background">

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-10 flex items-end justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#ec4899]/70" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                Generated Assets
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white/90 tracking-tight">
              Media Library
            </h1>
            <p className="text-sm text-white/35 mt-1.5">
              Every video and image your templates have generated.
            </p>
          </div>
          {totalCount > 0 && (
            <div className={cn(
              "px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04]",
              "text-[11px] font-mono text-white/30"
            )}>
              {totalCount} asset{totalCount !== 1 ? "s" : ""}
            </div>
          )}
        </motion.div>

        {/* Loading */}
        {isLoading && assets.length === 0 && <SkeletonGrid />}

        {/* Error */}
        {error && (
          <div className="text-center py-20 text-red-400/70 text-sm">{error}</div>
        )}

        {/* Empty */}
        {!isLoading && !error && assets.length === 0 && <EmptyState />}

        {/* Grouped grid */}
        {groups.length > 0 && (
          <div className="space-y-2">
            {groups.map(({ label, items }) => (
              <section key={label}>
                <SectionDivider label={label} count={items.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} projectId={projectId} />
                  ))}
                </div>
              </section>
            ))}

            {/* Load more */}
            {nextCursor && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoading}
                  className={cn(
                    "border-white/[0.12] bg-white/[0.04] text-white/50",
                    "hover:bg-white/[0.08] hover:text-white/70 hover:border-white/20",
                    "transition-all duration-150"
                  )}
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
                  Load older assets
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
