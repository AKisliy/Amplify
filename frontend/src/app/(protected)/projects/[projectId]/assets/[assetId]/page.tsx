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
} from "lucide-react";
import { ProjectHeader } from "@/components/ProjectHeader";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { projectApi } from "@/features/ambassadors/services/api";
import type { ProjectAsset, PublicationRecord } from "@/features/ambassadors/types";
import { getTemplateV1TemplatesTemplateIdGet } from "@/lib/api/template-service";

type TemplateMeta = { id: string; name: string } | null | undefined;

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case "published":
    case "success":
      return "bg-emerald-500/15 text-emerald-600 border-emerald-500/20";
    case "failed":
    case "error":
      return "bg-red-500/15 text-red-600 border-red-500/20";
    case "pending":
    case "processing":
      return "bg-yellow-500/15 text-yellow-600 border-yellow-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const assetId = params?.assetId as string;

  const { projects, isLoading: projectsLoading } = useProjects();

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

        // Fetch template and records in parallel
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
                    {records.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{rec.platform}</span>
                          {rec.errorMessage && (
                            <span className="text-xs text-destructive truncate max-w-[120px]" title={rec.errorMessage}>
                              {rec.errorMessage}
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(rec.status)}`}
                        >
                          {rec.status}
                        </span>
                      </div>
                    ))}
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
