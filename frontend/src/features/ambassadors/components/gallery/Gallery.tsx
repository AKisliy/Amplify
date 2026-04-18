"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useRef, useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { ambassadorApi } from "../../services/api";
import type { ReferenceImage } from "../../types";
import { mediaApi } from "@/features/media/api";
import { MediaCard } from "@/features/media/components/MediaCard";
import { MediaLightbox } from "@/features/media/components/MediaLightbox";
import type { UploadedMedia } from "@/features/media/useMediaUpload";
import { validateFile } from "@/features/media/api";

interface GalleryProps {
  ambassadorId: string;
  images: ReferenceImage[];
  onImagesChange: () => void;
}

function extractMediaId(url: string): string {
  const apiMatch = url?.match(/\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1];
  if (apiMatch) return apiMatch;
  const anyMatch = url?.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1];
  return anyMatch ?? "";
}

export function Gallery({ ambassadorId, images, onImagesChange }: GalleryProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [displayItems, setDisplayItems] = useState<UploadedMedia[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const linkIdMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const committedItems: UploadedMedia[] = images.map((img) => {
      const displayId = img.mediaId;
      linkIdMapRef.current.set(displayId, displayId);
      return {
        id: displayId,
        tinyUrl: mediaApi.getMediaUrl(img.mediaId, "Tiny"),
        url: mediaApi.getMediaUrl(img.mediaId),
        type: "image" as const,
        name: `${img.imageType} image`,
        size: 0,
        progress: 100,
        contentType: "image/jpeg",
      };
    });

    setDisplayItems((prev) => {
      const uploading = prev.filter(
        (item) => item.progress !== undefined && item.progress < 100 && !item.error
      );
      return [
        ...committedItems,
        ...uploading.filter((u) => !committedItems.some((c) => c.id === u.id)),
      ];
    });
  }, [images]);

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

  const handleReplaceMedia = useCallback(
    async (oldId: string, blob: Blob, mimeType: string) => {
      const file = new File([blob], "edited.jpg", { type: mimeType });

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

      try {
        await ambassadorApi.linkAmbassadorImage(ambassadorId, mediaId, "other");
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.message || "Failed to link image";
        toast({ variant: "destructive", title: "Link failed", description: msg });
        throw err;
      }

      try {
        await ambassadorApi.deleteAmbassadorImage(ambassadorId, oldId);
      } catch (err: any) {
        console.warn("Could not remove old ambassador image:", err);
        toast({
          variant: "destructive",
          title: "Cleanup warning",
          description: "Your edited image was saved, but the old one could not be removed automatically.",
        });
      }

      return { mediaId, mediaUrl };
    },
    [ambassadorId, toast]
  );

  const handleSave = useCallback(
    (oldId: string, newId: string, newUrl: string) => {
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

  const handleFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const validationErr = validateFile(file);
        if (validationErr) {
          toast({ variant: "destructive", title: "Invalid file", description: validationErr });
          continue;
        }

        let mediaId: string;
        let uploadUrl: string;
        try {
          ({ mediaId, uploadUrl } = await mediaApi.getPresignedUpload(file));
        } catch (err: any) {
          const msg = err?.response?.data?.detail || err?.message || "Failed to initiate upload";
          toast({ variant: "destructive", title: "Upload failed", description: msg });
          continue;
        }

        setDisplayItems((prev) => [
          ...prev,
          {
            id: mediaId,
            url: URL.createObjectURL(file),
            tinyUrl: "",
            type: "image" as const,
            name: file.name,
            size: file.size,
            progress: 0,
            contentType: file.type,
          },
        ]);

        try {
          await mediaApi.uploadToS3(mediaId, uploadUrl, file, (percent) => {
            setDisplayItems((prev) =>
              prev.map((item) =>
                item.id === mediaId ? { ...item, progress: percent } : item
              )
            );
          });

          await ambassadorApi.linkAmbassadorImage(ambassadorId, mediaId, "other");

          setDisplayItems((prev) =>
            prev.map((item) =>
              item.id === mediaId
                ? {
                    ...item,
                    url: mediaApi.getMediaUrl(mediaId, "Medium"),
                    tinyUrl: mediaApi.getMediaUrl(mediaId, "Tiny"),
                    progress: 100,
                  }
                : item
            )
          );

          toast({ title: "Image uploaded", description: `${file.name} has been added to the gallery.` });
          onImagesChange();
        } catch (err: any) {
          const msg = err?.response?.data?.detail || err?.message || "Upload failed";
          setDisplayItems((prev) =>
            prev.map((item) =>
              item.id === mediaId ? { ...item, error: msg, progress: undefined } : item
            )
          );
          toast({ variant: "destructive", title: "Upload failed", description: msg });
        }
      }
    },
    [ambassadorId, onImagesChange, toast]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) handleFiles(files);
    e.target.value = "";
  };

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const isTemp = id.startsWith("temp-");
        if (!isTemp) {
          const backendId = linkIdMapRef.current.get(id) || id;
          try {
            await ambassadorApi.deleteAmbassadorImage(ambassadorId, backendId);
          } catch (firstErr: any) {
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
          toast({ title: "Deleted", description: "Image removed from gallery." });
        }
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.message || "Please try again.";
        toast({ variant: "destructive", title: "Delete failed", description: msg });
      }
    },
    [ambassadorId, displayItems, onImagesChange, toast]
  );

  const readyItems = displayItems.filter((item) => !item.error && item.progress === 100);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

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

        {/* Upload card — always last in the grid */}
        <motion.button
          layout
          type="button"
          onClick={() => inputRef.current?.click()}
          className="aspect-square rounded-xl border-2 border-dashed border-border/50 bg-muted/20 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </motion.div>

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
