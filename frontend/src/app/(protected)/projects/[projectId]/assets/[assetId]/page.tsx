"use client";

// =============================================================================
// AssetDetailPage — Full view of a single generated asset
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ImageIcon,
  Video,
  Play,
  FileQuestion,
  Send,
  Loader2,
  ExternalLink,
  Clock,
  LayoutTemplate,
  CalendarDays,
  TrendingUp,
  Eye,
  Users,
  Heart,
  Download,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { ProjectHeader } from "@/components/ProjectHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { projectApi } from "@/features/ambassadors/services/api";
import type { ProjectAsset, PublicationRecord } from "@/features/ambassadors/types";
import { getTemplateV1TemplatesTemplateIdGet } from "@/lib/api/template-service";
import { useHubConnection } from "@/hooks/useHubConnection";

type TemplateMeta = { id: string; name: string } | null | undefined;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case "published":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "failed":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "processing":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "scheduled":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-white/10 text-white/70 border-white/20";
  }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Social provider icon
// ---------------------------------------------------------------------------

function ProviderIcon({ provider, size = 4 }: { provider: string; size?: number }) {
  const cls = `w-${size} h-${size} fill-current`;
  const p = provider.toLowerCase();
  if (p === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={`${cls} text-pink-400`} aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    );
  }
  if (p === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className={`${cls} text-white`} aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
      </svg>
    );
  }
  return <span className="text-xs text-white/60">{provider[0].toUpperCase()}</span>;
}

// ---------------------------------------------------------------------------
// Analytics stat card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={cn(
      "flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-4",
      "hover:border-white/[0.12] transition-colors duration-200"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", accent ?? "bg-white/[0.07]")}>
          {icon}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white/85 tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Publication card (social post)
// ---------------------------------------------------------------------------

function PublicationCard({ rec, thumbnailUrl }: { rec: PublicationRecord; thumbnailUrl: string }) {
  const statusLow = rec.status.toLowerCase();
  const isPublished = statusLow === "published";
  const timeLabel = isPublished && rec.publishedAt
    ? formatTime(rec.publishedAt)
    : rec.scheduledAt
      ? formatTime(rec.scheduledAt)
      : null;

  const inner = (
    <div className={cn(
      "relative rounded-xl overflow-hidden bg-black/40 aspect-[9/16] group cursor-pointer",
      "border border-white/[0.06] hover:border-white/[0.15]",
      "transition-all duration-200"
    )}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* Top-left: avatar */}
      <div className="absolute top-2.5 left-2.5">
        {rec.socialAccount?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rec.socialAccount.avatarUrl}
            alt={rec.socialAccount.username}
            className="w-7 h-7 rounded-full object-cover ring-1 ring-white/30"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
            <span className="text-[10px] font-bold text-white">
              {rec.socialAccount?.username?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
        )}
      </div>

      {/* Top-right: provider icon */}
      <div className="absolute top-2.5 right-2.5">
        <ProviderIcon provider={rec.provider} size={5} />
      </div>

      {/* Bottom: info */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 space-y-1.5">
        <p className="text-white text-xs font-medium truncate leading-none">
          @{rec.socialAccount?.username ?? rec.provider}
        </p>
        {timeLabel && (
          <div className="flex items-center gap-1 text-white/50 text-[10px]">
            <Clock className="w-2.5 h-2.5 shrink-0" />
            {timeLabel}
          </div>
        )}
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor(rec.status)}`}>
          {rec.status}
        </span>
      </div>

      {/* Hover overlay */}
      {isPublished && rec.publicUrl && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-white text-xs font-medium">
            <ExternalLink className="w-3.5 h-3.5" />
            View post
          </div>
        </div>
      )}
    </div>
  );

  if (isPublished && rec.publicUrl) {
    return <a href={rec.publicUrl} target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  return inner;
}

// ---------------------------------------------------------------------------
// Metadata row item
// ---------------------------------------------------------------------------

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className="w-7 h-7 rounded-md bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25 mb-0.5">{label}</p>
        <div className="text-sm text-white/75">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const assetId = params?.assetId as string;

  const { projects, isLoading: projectsLoading } = useProjects();
  const { connection } = useHubConnection();

  const [asset, setAsset] = useState<ProjectAsset | null>(null);
  const [template, setTemplate] = useState<TemplateMeta>(undefined);
  const [records, setRecords] = useState<PublicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!assetId) return;
    setLoading(true);
    setError(null);

    projectApi.getProjectAsset(assetId)
      .then(async (fetchedAsset) => {
        setAsset(fetchedAsset);
        const [templateResult, recordsResult] = await Promise.allSettled([
          fetchedAsset.templateId
            ? getTemplateV1TemplatesTemplateIdGet({ path: { template_id: fetchedAsset.templateId } })
            : Promise.resolve(null),
          projectApi.getMediaPostRecords(assetId),
        ]);

        if (templateResult.status === "fulfilled" && templateResult.value) {
          const data = (templateResult.value as any).data;
          setTemplate(data ? { id: data.id, name: data.name } : null);
        } else {
          setTemplate(null);
        }

        if (recordsResult.status === "fulfilled") {
          setRecords(recordsResult.value ?? []);
        }
      })
      .catch(() => setError("Failed to load asset."))
      .finally(() => setLoading(false));
  }, [assetId]);

  // Live SignalR status updates
  useEffect(() => {
    if (!connection) return;
    const handler = (publicationRecordId: string, status: string, publicUrl: string | null) => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === publicationRecordId
            ? { ...r, status, publicUrl: publicUrl ?? r.publicUrl }
            : r
        )
      );
    };
    connection.on("OnPublicationStatusChanged", handler);
    return () => connection.off("OnPublicationStatusChanged", handler);
  }, [connection]);

  const isVideo = asset?.mediaType === "Video";
  const publishedCount = records.filter((r) => r.status.toLowerCase() === "published").length;

  return (
    <div className="min-h-screen bg-background">
      <ProjectHeader projects={projects} isLoading={projectsLoading} />

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Back */}
        <button
          onClick={() => router.push(`/projects/${projectId}/assets`)}
          className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white/70 transition-colors mb-7 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Assets
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-7 h-7 animate-spin text-white/20" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-20 text-red-400/60 text-sm">{error}</div>
        )}

        {/* Content */}
        {!loading && !error && asset && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10"
          >
            {/* ── Hero + Metadata ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Media */}
              <div className="lg:col-span-3 space-y-3">
                <div className={cn(
                  "relative rounded-2xl overflow-hidden bg-black/50",
                  "border border-white/[0.07]",
                  isVideo ? "aspect-video" : "aspect-video"
                )}>
                  {isVideo ? (
                    <>
                      <video
                        ref={videoRef}
                        src={asset.mediaUrl}
                        className="w-full h-full object-contain"
                        preload="none"
                        playsInline
                        controls={videoPlaying}
                        onEnded={() => setVideoPlaying(false)}
                      />
                      <AnimatePresence>
                        {!videoPlaying && (
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setVideoPlaying(true); videoRef.current?.play(); }}
                            className="absolute inset-0 flex items-center justify-center group"
                          >
                            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-black/80 group-hover:scale-110 transition-all duration-200">
                              <Play className="w-6 h-6 text-white ml-0.5" />
                            </div>
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.mediaUrl} alt="Generated asset" className="w-full h-full object-contain" />
                  )}

                  {/* Type badge */}
                  <div className={cn(
                    "absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm",
                    isVideo
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : "bg-[#ec4899]/15 text-[#ec4899] border border-[#ec4899]/30"
                  )}>
                    {isVideo ? <Video className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                    {isVideo ? "Video" : "Image"}
                  </div>
                </div>

                {/* Download / open */}
                <div className="flex items-center gap-3">
                  <a
                    href={asset.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open original
                  </a>
                  <a
                    href={asset.mediaUrl}
                    download
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
              </div>

              {/* Right: Metadata */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/20 pt-2 pb-1">
                    Asset Details
                  </p>

                  <MetaRow
                    icon={<CalendarDays className="w-3.5 h-3.5 text-white/40" />}
                    label="Generated"
                  >
                    {formatDateTime(asset.createdAt)}
                  </MetaRow>

                  <MetaRow
                    icon={<LayoutTemplate className="w-3.5 h-3.5 text-white/40" />}
                    label="Template"
                  >
                    {template === undefined ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />
                    ) : template === null ? (
                      <span className="text-white/25 flex items-center gap-1">
                        <FileQuestion className="w-3.5 h-3.5" />
                        Not found
                      </span>
                    ) : (
                      <button
                        onClick={() => router.push(`/projects/${projectId}/templates/${template.id}`)}
                        className="text-[#ec4899]/80 hover:text-[#ec4899] hover:underline flex items-center gap-1 transition-colors"
                      >
                        {template.name}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </MetaRow>

                  <MetaRow
                    icon={<Sparkles className="w-3.5 h-3.5 text-white/40" />}
                    label="Type"
                  >
                    {asset.mediaType}
                  </MetaRow>

                  <MetaRow
                    icon={<Send className="w-3.5 h-3.5 text-white/40" />}
                    label="Publications"
                  >
                    <span className={publishedCount > 0 ? "text-emerald-400" : "text-white/40"}>
                      {publishedCount} published
                    </span>
                    {records.length > publishedCount && (
                      <span className="text-white/25 ml-1.5">/ {records.length} total</span>
                    )}
                  </MetaRow>
                </div>
              </div>
            </div>

            {/* ── Analytics row (stub — ready for real data) ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-white/25" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/30">
                  Analytics
                </h2>
                <span className="ml-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/25 border border-white/[0.06]">
                  Coming soon
                </span>
              </div>
              <div className="flex gap-4">
                <StatCard
                  icon={<Eye className="w-3.5 h-3.5 text-blue-400/70" />}
                  label="Total Views"
                  value="—"
                  sub="Across all platforms"
                  accent="bg-blue-500/10"
                />
                <StatCard
                  icon={<Users className="w-3.5 h-3.5 text-violet-400/70" />}
                  label="Reach"
                  value="—"
                  sub="Unique accounts"
                  accent="bg-violet-500/10"
                />
                <StatCard
                  icon={<Heart className="w-3.5 h-3.5 text-[#ec4899]/70" />}
                  label="Engagement"
                  value="—"
                  sub="Likes + comments"
                  accent="bg-[#ec4899]/10"
                />
                <StatCard
                  icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400/70" />}
                  label="Publications"
                  value={String(records.length)}
                  sub={`${publishedCount} live`}
                  accent="bg-emerald-500/10"
                />
              </div>
            </div>

            {/* ── Publications ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Send className="w-4 h-4 text-white/25" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/30">
                  Publications
                </h2>
                {records.length > 0 && (
                  <span className="ml-1 text-[9px] font-mono text-white/20">
                    {records.length}
                  </span>
                )}
              </div>

              {records.length === 0 ? (
                <div className={cn(
                  "rounded-2xl border border-dashed border-white/[0.08] px-6 py-14",
                  "flex flex-col items-center gap-3 text-center"
                )}>
                  <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                    <Send className="w-4 h-4 text-white/25" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/40">No publications yet</p>
                    <p className="text-xs text-white/20 mt-0.5">Share this asset to social media to see it here.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {records.map((rec) => (
                    <PublicationCard key={rec.id} rec={rec} thumbnailUrl={asset.mediaUrl} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}


