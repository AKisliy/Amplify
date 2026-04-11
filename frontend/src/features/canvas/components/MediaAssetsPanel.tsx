"use client";

// =============================================================================
// MediaAssetsPanel — Collapsible panel showing ambassador media assets.
// Assets are draggable onto the canvas (application/amplify-media).
// Includes an Upload button to add new media to the ambassador gallery.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImageIcon,
  VideoIcon,
  Upload,
  Loader2,
  AlertCircle,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaApi, detectMediaType } from "@/features/media/api";
import { ambassadorApi, projectApi } from "@/features/ambassadors/services/api";
import type { AmbassadorImage } from "@/features/ambassadors/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaAssetDragPayload {
  url: string;
  mediaType: "image" | "video";
  id: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MediaAssetsPanelProps {
  isOpen: boolean;
  projectId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MediaAssetsPanel({ isOpen, projectId }: MediaAssetsPanelProps) {
  const [images, setImages] = useState<AmbassadorImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ambassadorId, setAmbassadorId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the project once to get ambassadorId
  useEffect(() => {
    if (!projectId) return;
    projectApi
      .getProject(projectId)
      .then((p) => setAmbassadorId(p.ambassadorId ?? null))
      .catch(() => setAmbassadorId(null));
  }, [projectId]);

  // Fetch ambassador images whenever ambassadorId changes
  const fetchImages = useCallback(async () => {
    if (!ambassadorId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await ambassadorApi.getAmbassadorImages(ambassadorId);
      setImages(data);
    } catch {
      setError("Failed to load media assets.");
    } finally {
      setIsLoading(false);
    }
  }, [ambassadorId]);

  useEffect(() => {
    if (isOpen) fetchImages();
  }, [isOpen, fetchImages]);

  // Upload handler
  const handleUpload = useCallback(
    async (file: File) => {
      if (!ambassadorId) return;
      setIsUploading(true);
      try {
        const result = await mediaApi.uploadFile(file);
        await ambassadorApi.linkAmbassadorImage(
          ambassadorId,
          result.mediaId,
          result.type === "video" ? 1 : 0
        );
        await fetchImages();
      } catch {
        setError("Upload failed.");
      } finally {
        setIsUploading(false);
      }
    },
    [ambassadorId, fetchImages]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await handleUpload(file);
        e.target.value = "";
      }
    },
    [handleUpload]
  );

  // Drag start — encode the asset URL + type for the canvas drop handler
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, asset: AmbassadorImage) => {
      const mediaType = asset.imageType === 1 ? "video" : "image";
      const payload: MediaAssetDragPayload = {
        url: mediaApi.getMediaUrl(asset.mediaId, "tiny"),
        mediaType,
        id: asset.mediaId,
      };
      e.dataTransfer.setData("application/amplify-media", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.aside
          key="media-assets"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "border-r border-border/40 bg-card/20 backdrop-blur-sm",
            "flex flex-col h-full shrink-0 overflow-hidden"
          )}
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border/30 shrink-0 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Media Assets
            </span>
            <div className="flex items-center gap-1">
              {isUploading && (
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground/50 animate-spin" />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !ambassadorId}
                title="Upload media"
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center",
                  "hover:bg-white/[0.08] transition-colors",
                  "text-muted-foreground/50 hover:text-white/70",
                  (!ambassadorId || isUploading) && "opacity-40 pointer-events-none"
                )}
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-muted-foreground/30 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-1.5 py-8 text-center px-2">
                <AlertCircle className="w-5 h-5 text-red-400/50" />
                <p className="text-[11px] text-muted-foreground/40">{error}</p>
              </div>
            ) : !ambassadorId ? (
              <div className="flex flex-col items-center gap-1.5 py-8 text-center px-2">
                <ImageIcon className="w-5 h-5 text-muted-foreground/20" />
                <p className="text-[11px] text-muted-foreground/30 leading-snug">
                  No ambassador linked
                  <br />to this project
                </p>
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-8 text-center px-2">
                <ImageIcon className="w-5 h-5 text-muted-foreground/20" />
                <p className="text-[11px] text-muted-foreground/30 leading-snug">
                  No assets yet.
                  <br />Upload to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {images.map((asset) => (
                  <AssetCard
                    key={asset.mediaId}
                    asset={asset}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// AssetCard
// ---------------------------------------------------------------------------

function AssetCard({
  asset,
  onDragStart,
}: {
  asset: AmbassadorImage;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, asset: AmbassadorImage) => void;
}) {
  const isVideo = asset.imageType === 1;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, asset)}
      className={cn(
        "group relative aspect-square rounded-lg overflow-hidden",
        "border border-white/[0.07] bg-black/25",
        "cursor-grab active:cursor-grabbing",
        "hover:border-white/[0.18] hover:ring-1 hover:ring-white/[0.1]",
        "transition-all duration-150"
      )}
      title={isVideo ? "Video — drag to canvas" : "Image — drag to canvas"}
    >
      {/* Thumbnail */}
      {isVideo ? (
        <div className="relative w-full h-full bg-black">
          {/* Real video thumbnail — browser loads first frame from metadata */}
          <video
            src={mediaApi.getMediaUrl(asset.mediaId)}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            // Seek to 0.1s so browsers that start at 0 show a frame
            onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }}
          />
          {/* Badge */}
          <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/60 rounded px-1 py-0.5">
            <VideoIcon className="w-2.5 h-2.5 text-red-400" />
            <span className="text-[8px] text-red-300 font-medium leading-none">VIDEO</span>
          </div>
        </div>
      ) : imgError ? (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-muted-foreground/20" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaApi.getMediaUrl(asset.mediaId)}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      )}

      {/* Drag handle overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-start p-1 opacity-0 group-hover:opacity-100">
        <GripVertical className="w-3.5 h-3.5 text-white/60" />
      </div>
    </div>
  );
}
