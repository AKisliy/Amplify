"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  CheckCircle2,
} from "lucide-react";
import { ProjectHeader } from "@/components/ProjectHeader";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { projectApi } from "@/features/ambassadors/services/api";
import type { ProjectAsset, PublicationRecord } from "@/features/ambassadors/types";
import { getTemplateV1TemplatesTemplateIdGet } from "@/lib/api/template-service";
import { useHubConnection } from "@/hooks/useHubConnection";

type TemplateMeta = { id: string; name: string } | null | undefined;

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case "published":
      return "bg-emerald-500/15 text-emerald-600 border-emerald-500/20";
    case "failed":
      return "bg-red-500/15 text-red-600 border-red-500/20";
    case "processing":
      return "bg-blue-500/15 text-blue-600 border-blue-500/20";
    case "scheduled":
      return "bg-yellow-500/15 text-yellow-700 border-yellow-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function ProviderIcon({ provider }: { provider: string }) {
  const p = provider.toLowerCase();
  if (p === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-pink-500" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    );
  }
  if (p === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-foreground" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
      </svg>
    );
  }
  return <span className="text-xs text-muted-foreground">{provider}</span>;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

    projectApi
      .getProjectAsset(assetId)
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

  // Live status updates via SignalR
  useEffect(() => {
    if (!connection) return;

    const handler = (
      publicationRecordId: string,
      status: string,
      publicUrl: string | null,
    ) => {
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

  return (
    <div className="min-h-screen bg-background">
      <ProjectHeader projects={projects} isLoading={projectsLoading} />

      <div className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Back button */}
        <button
          onClick={() => router.push(`/projects/${projectId}/assets`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assets
        </button>

        {loading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-destructive">{error}</div>
        )}

        {!loading && !error && asset && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-8"
          >
            {/* Media preview — takes 3 cols */}
            <div className="lg:col-span-3 space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-muted/40 aspect-video flex items-center justify-center">
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
                    {!videoPlaying && (
                      <button
                        onClick={() => {
                          setVideoPlaying(true);
                          videoRef.current?.play();
                        }}
                        className="absolute inset-0 flex items-center justify-center group"
                      >
                        <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/80 transition-colors">
                          <Play className="w-7 h-7 text-white ml-1" />
                        </div>
                      </button>
                    )}
                  </>
                ) : (
                  <img
                    src={asset.mediaUrl}
                    alt="Generated asset"
                    className="w-full h-full object-contain"
                  />
                )}

                {/* type badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                  {isVideo
                    ? <><Video className="w-3 h-3" /> Video</>
                    : <><ImageIcon className="w-3 h-3" /> Image</>
                  }
                </div>
              </div>

              {/* Open original */}
              <a
                href={asset.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open original
              </a>
            </div>

            {/* Metadata + publications — takes 2 cols */}
            <div className="lg:col-span-2 space-y-6">
              {/* Meta */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Details</h2>
                <div className="rounded-xl border border-border/50 divide-y divide-border/50 text-sm">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-muted-foreground">Created</span>
                    <span>
                      {new Date(asset.createdAt).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-muted-foreground">Template</span>
                    {template === null ? (
                      <span className="text-muted-foreground italic flex items-center gap-1">
                        <FileQuestion className="w-3.5 h-3.5" />
                        Not found
                      </span>
                    ) : template === undefined ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <button
                        onClick={() =>
                          router.push(`/projects/${projectId}/templates/${template.id}`)
                        }
                        className="text-primary hover:underline truncate max-w-[160px]"
                      >
                        {template.name}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Publications */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Publications</h2>

                {records.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 px-5 py-8 flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center">
                      <Send className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No publications yet</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Share this asset to social media.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" disabled>
                      Create your first publication
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/50 divide-y divide-border/50 text-sm">
                    {records.map((rec) => {
                      const statusLow = rec.status.toLowerCase();
                      const timeLabel =
                        statusLow === "published" && rec.publishedAt
                          ? formatTime(rec.publishedAt)
                          : rec.scheduledAt
                          ? formatTime(rec.scheduledAt)
                          : null;
                      const TimeIcon =
                        statusLow === "published" ? CheckCircle2 : Clock;

                      return (
                        <div key={rec.id} className="flex items-center gap-3 px-4 py-3">
                          {/* Avatar */}
                          {rec.socialAccount?.avatarUrl ? (
                            <img
                              src={rec.socialAccount.avatarUrl}
                              alt={rec.socialAccount.username}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium text-muted-foreground">
                                {rec.socialAccount?.username?.[0]?.toUpperCase() ?? "?"}
                              </span>
                            </div>
                          )}

                          {/* Account + time */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <ProviderIcon provider={rec.provider} />
                              <span className="font-medium truncate">
                                {rec.socialAccount?.username ?? rec.provider}
                              </span>
                            </div>
                            {timeLabel && (
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                <TimeIcon className="w-3 h-3 shrink-0" />
                                {timeLabel}
                              </div>
                            )}
                          </div>

                          {/* Status badge */}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${statusColor(rec.status)}`}
                          >
                            {rec.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
