"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useRef, useState, useEffect } from "react";
import { ambassadorApi } from "../../services/api";
import type { AmbassadorImage } from "../../types";
import { mediaApi, type MediaType } from "@/features/media/api";
import { MediaDropzone } from "@/features/media/components/MediaDropzone";
import { MediaCard } from "@/features/media/components/MediaCard";
import { MediaLightbox } from "@/features/media/components/MediaLightbox";
import type { UploadedMedia } from "@/features/media/useMediaUpload";
import { validateFile } from "@/features/media/api";

interface GalleryProps {
  ambassadorId: string;
  images: AmbassadorImage[];
  onImagesChange: () => void;
}

/**
 * Extract a UUID from any URL — matches /api/media/{uuid} but also any
 * path segment that looks like a UUID (e.g. GCS storage paths).
 */
function extractMediaId(url: string): string {
  // Prefer /api/media/{uuid} pattern first
  const apiMatch = url?.match(/\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1];
  if (apiMatch) return apiMatch;
  // Fall back to any UUID-shaped path segment (covers GCS URLs)
  const anyMatch = url?.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1];
  return anyMatch ?? "";
}

/** Map backend imageType number to MediaType */
function resolveType(img: AmbassadorImage): MediaType {
  // imageType: 0 = image, 1 = video
  if (img.imageType === 1) return "video";
  // Fallback: URL heuristic
  if (img.imageUrl?.toLowerCase()?.match(/\.(mp4|webm|mov)(\?|$)/)) return "video";
  return "image";
}

export function Gallery({ ambassadorId, images, onImagesChange }: GalleryProps) {
  const { toast } = useToast();

  const [displayItems, setDisplayItems] = useState<UploadedMedia[]>([]);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  /**
   * Maps the display-item id → the backend link-record id used for DELETE.
   * Kept in a ref so handleDelete always sees the latest value without
   * creating stale closure problems.
   */
  const linkIdMapRef = useRef<Map<string, string>>(new Map());

  // ── Sync committed images → display items ──────────────────────────────────

  useEffect(() => {
    const committedItems: UploadedMedia[] = images.map((img, i) => {
      const displayId = img.id || extractMediaId(img.imageUrl) || `persist-${i}-${img.imageUrl?.slice(-8)}`;

      // Always record the backend's own id for the DELETE call.
      // Priority: img.id (link-record id) → mediaId from URL → GCS UUID from URL
      const backendId = img.id || extractMediaId(img.imageUrl) || displayId;
      linkIdMapRef.current.set(displayId, backendId);

      return {
        id: displayId,
        url: img.imageUrl,
        type: resolveType(img),
        name: "Ambassador media",
        size: 0,
        progress: 100,
        contentType: img.imageType === 1 ? "video/mp4" : "image/jpeg",
      };
    });

    setDisplayItems((prev) => {
      // Keep items still uploading (progress < 100 and no error)
      const uploading = prev.filter(
        (item) => item.progress !== undefined && item.progress < 100 && !item.error
      );
      return [
        ...committedItems,
        ...uploading.filter((u) => !committedItems.some((c) => c.id === u.id)),
      ];
    });
  }, [images]);

  // ── Open lightbox ──────────────────────────────────────────────────────────

  const handleOpen = useCallback(
    (id: string) => {
      const readyItems = displayItems.filter((item) => !item.error && item.progress === 100);
      const idx = readyItems.findIndex((item) => item.id === id);
      if (idx === -1) return;
      setLightboxIndex(idx);
      setLightboxOpen(true);
    },
    [displayItems]
  );

  // ── Replace media after in-lightbox edit ───────────────────────────────────

  const handleReplaceMedia = useCallback(
    async (oldId: string, blob: Blob, mimeType: string) => {
      const file = new File([blob], "edited.jpg", { type: mimeType });

      // 1. Upload the edited blob as a new image
      let mediaId: string;
      let mediaUrl: string;
      try {
        const result = await mediaApi.uploadFile(file);
        mediaId = result.mediaId;
        mediaUrl = mediaApi.getMediaUrl(result.mediaId);
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.message || "Upload failed";
        toast({ variant: "destructive", title: "Upload failed", description: msg });
        throw err;
      }

      // 2. Link new media to ambassador
      try {
        await ambassadorApi.linkAmbassadorImage(ambassadorId, mediaId, 0);
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.message || "Failed to link image to ambassador";
        toast({ variant: "destructive", title: "Link failed", description: msg });
        throw err;
      }

      // 3. Unlink old media from ambassador (best-effort — new image is already saved)
      try {
        await ambassadorApi.deleteAmbassadorImage(ambassadorId, oldId);
      } catch (err: any) {
        console.warn("Could not remove old ambassador image:", err);
        toast({
          variant: "destructive",
          title: "Cleanup warning",
          description: "Your edited image was saved, but the old one could not be removed automatically.",
        });
        // Don't re-throw — the core operation succeeded
      }

      return { mediaId, mediaUrl };
    },
    [ambassadorId, toast]
  );

  // ── Handle save callback from lightbox ─────────────────────────────────────

  const handleSave = useCallback(
    (oldId: string, newId: string, newUrl: string) => {
      // Update display items immediately (optimistic)
      setDisplayItems((prev) =>
        prev.map((item) =>
          item.id === oldId
            ? { ...item, id: newId, url: newUrl, contentType: "image/jpeg" }
            : item
        )
      );
      onImagesChange();
      toast({ title: "Saved", description: "Your changes have been applied to the gallery." });
    },
    [onImagesChange, toast]
  );

  // ── Upload handler ─────────────────────────────────────────────────────────

  const handleFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const validationErr = validateFile(file);
        if (validationErr) {
          toast({ variant: "destructive", title: "Invalid file", description: validationErr });
          continue;
        }

        const mediaType: MediaType = file.type.startsWith("video") ? "video" : "image";
        const tempId = `temp-${Math.random().toString(36).slice(2)}`;

        const tempEntry: UploadedMedia = {
          id: tempId,
          url: URL.createObjectURL(file),
          type: mediaType,
          name: file.name,
          size: file.size,
          progress: 0,
          contentType: file.type,
        };

        setDisplayItems((prev) => [...prev, tempEntry]);

        try {
          const result = await mediaApi.uploadFile(file, (percent) => {
            setDisplayItems((prev) =>
              prev.map((item) =>
                item.id === tempId ? { ...item, progress: percent } : item
              )
            );
          });

          // Use imageType 1 for videos
          const imageType: 0 | 1 = result.type === "video" ? 1 : 0;
          await ambassadorApi.linkAmbassadorImage(ambassadorId, result.mediaId, imageType);

          setDisplayItems((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? {
                    id: result.mediaId,
                    url: mediaApi.getMediaUrl(result.mediaId),
                    type: result.type,
                    name: file.name,
                    size: file.size,
                    progress: 100,
                    contentType: file.type,
                  }
                : item
            )
          );

          toast({
            title: `${mediaType === "video" ? "Video" : "Image"} uploaded`,
            description: `${file.name} has been added to the gallery.`,
          });

          onImagesChange();
        } catch (err: any) {
          const msg = err?.response?.data?.detail || err?.message || "Upload failed";
          setDisplayItems((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? { ...item, error: msg, progress: undefined }
                : item
            )
          );
          toast({ variant: "destructive", title: "Upload failed", description: msg });
        }
      }
    },
    [ambassadorId, onImagesChange, toast]
  );

  // ── Delete handler ──────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const isTemp = id.startsWith("temp-");
        if (!isTemp) {
          // Use the backend link-record id stored in the ref map, fallback to display id
          const backendId = linkIdMapRef.current.get(id) || id;
          try {
            await ambassadorApi.deleteAmbassadorImage(ambassadorId, backendId);
          } catch (firstErr: any) {
            // If the link-record id failed, try the media UUID extracted from the URL
            const status = firstErr?.response?.status;
            if (status === 500 || status === 404 || status === 400) {
              const item = displayItems.find((i) => i.id === id);
              const mediaIdFromUrl = item ? extractMediaId(item.url) : "";
              if (mediaIdFromUrl && mediaIdFromUrl !== backendId) {
                await ambassadorApi.deleteAmbassadorImage(ambassadorId, mediaIdFromUrl);
              } else {
                throw firstErr;
              }
            } else {
              throw firstErr;
            }
          }
          linkIdMapRef.current.delete(id);
        }
        setDisplayItems((prev) => prev.filter((item) => item.id !== id));
        if (!isTemp) {
          onImagesChange();
          toast({ title: "Deleted", description: "Media removed from gallery." });
        }
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.message || "Please try again.";
        toast({ variant: "destructive", title: "Delete failed", description: msg });
      }
    },
    [ambassadorId, displayItems, onImagesChange, toast]
  );

  // Items that can appear in the lightbox (fully uploaded, no error)
  const readyItems = displayItems.filter(
    (item) => !item.error && item.progress === 100
  );

  return (
    <div className="space-y-6">
      <MediaDropzone onFiles={handleFiles} acceptVideo />

      <AnimatePresence mode="popLayout">
        {displayItems.length > 0 ? (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {displayItems.map((item, i) => (
                <MediaCard
                  key={item.id || `card-${i}`}
                  media={item}
                  onDelete={!item.error ? handleDelete : undefined}
                  onOpen={handleOpen}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8 text-center text-sm text-muted-foreground"
          >
            No media yet — drag files above or click to browse.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen lightbox + editor */}
      <MediaLightbox
        items={readyItems}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onReplaceMedia={handleReplaceMedia}
        onSave={handleSave}
      />
    </div>
  );
}
