"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useState, useEffect } from "react";
import { ambassadorApi } from "../../services/api";
import type { AmbassadorImage } from "../../types";
import { mediaApi } from "@/features/media/api";
import { MediaDropzone } from "@/features/media/components/MediaDropzone";
import { MediaCard } from "@/features/media/components/MediaCard";
import type { UploadedMedia } from "@/features/media/useMediaUpload";
import { validateFile } from "@/features/media/api";

interface GalleryProps {
  ambassadorId: string;
  images: AmbassadorImage[];
  onImagesChange: () => void;
}

export function Gallery({ ambassadorId, images, onImagesChange }: GalleryProps) {
  const { toast } = useToast();

  // Build display list from committed images
  const [displayItems, setDisplayItems] = useState<UploadedMedia[]>([]);

  // Sync displayItems when the images prop changes (e.g. after refetch)
  useEffect(() => {
    setDisplayItems(
      images.map((img) => ({
        id: img.id,
        url: img.imageUrl,
        type: "image" as const,
        name: img.id,
        size: 0,
        progress: 100,
      }))
    );
  }, [images]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const validationErr = validateFile(file);
        if (validationErr) {
          toast({ variant: "destructive", title: "Invalid file", description: validationErr });
          continue;
        }

        const mediaType = file.type.startsWith("video") ? "video" : "image";
        const tempId = `temp-${Math.random().toString(36).slice(2)}`;
        const tempEntry: UploadedMedia = {
          id: tempId,
          url: URL.createObjectURL(file),
          type: mediaType,
          name: file.name,
          size: file.size,
          progress: 0,
        };

        setDisplayItems((prev) => [...prev, tempEntry]);

        try {
          // Upload to media ingest
          const result = await mediaApi.uploadFile(file, (percent) => {
            setDisplayItems((prev) =>
              prev.map((item) =>
                item.id === tempId ? { ...item, progress: percent } : item
              )
            );
          });

          // Link to ambassador
          await ambassadorApi.linkAmbassadorImage(ambassadorId, result.mediaId);

          // Replace temp entry with committed entry
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
              item.id === tempId ? { ...item, error: msg, progress: undefined } : item
            )
          );
          toast({ variant: "destructive", title: "Upload failed", description: msg });
        }
      }
    },
    [ambassadorId, onImagesChange, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        // If it's a real (committed) id, delete via API
        const isTemp = id.startsWith("temp-");
        if (!isTemp) {
          await ambassadorApi.deleteAmbassadorImage(ambassadorId, id);
        }
        setDisplayItems((prev) => prev.filter((item) => item.id !== id));
        if (!isTemp) {
          onImagesChange();
          toast({ title: "Deleted", description: "Media removed from gallery." });
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "Delete failed", description: "Please try again." });
      }
    },
    [ambassadorId, onImagesChange, toast]
  );

  return (
    <div className="space-y-6">
      <MediaDropzone onFiles={handleFiles} acceptVideo />

      <AnimatePresence mode="popLayout">
        {displayItems.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {displayItems.map((item) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  onDelete={!item.error ? handleDelete : undefined}
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
    </div>
  );
}
