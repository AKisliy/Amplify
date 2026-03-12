"use client";

import { useState, useCallback } from "react";
import { mediaApi, validateFile, type MediaType } from "@/features/media/api";

export interface UploadedMedia {
  id: string;         // mediaId from backend
  url: string;        // public CDN URL
  type: MediaType;
  name: string;
  size: number;
  progress?: number;  // 0–100 while uploading
  error?: string;
}

interface UseMediaUploadOptions {
  onSuccess?: (result: UploadedMedia) => void;
  onError?: (error: string, file: File) => void;
}

export function useMediaUpload(options: UseMediaUploadOptions = {}) {
  const [uploads, setUploads] = useState<UploadedMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadedMedia | null> => {
      const validationError = validateFile(file);
      if (validationError) {
        options.onError?.(validationError, file);
        return null;
      }

      // Create a temporary id for tracking
      const tempId = `temp-${Math.random().toString(36).slice(2)}`;
      const tempEntry: UploadedMedia = {
        id: tempId,
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video") ? "video" : "image",
        name: file.name,
        size: file.size,
        progress: 0,
      };

      setUploads((prev) => [...prev, tempEntry]);
      setIsUploading(true);

      try {
        const result = await mediaApi.uploadFile(file, (percent) => {
          setUploads((prev) =>
            prev.map((u) => (u.id === tempId ? { ...u, progress: percent } : u))
          );
        });

        const finalEntry: UploadedMedia = {
          id: result.mediaId,
          url: mediaApi.getMediaUrl(result.mediaId),
          type: result.type,
          name: file.name,
          size: file.size,
          progress: 100,
        };

        setUploads((prev) =>
          prev.map((u) => (u.id === tempId ? finalEntry : u))
        );

        options.onSuccess?.(finalEntry);
        return finalEntry;
      } catch (err: any) {
        const message = err?.response?.data?.detail || err?.message || "Upload failed";
        setUploads((prev) =>
          prev.map((u) => (u.id === tempId ? { ...u, error: message, progress: undefined } : u))
        );
        options.onError?.(message, file);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const results: (UploadedMedia | null)[] = [];
      for (const file of files) {
        results.push(await uploadFile(file));
      }
      return results.filter(Boolean) as UploadedMedia[];
    },
    [uploadFile]
  );

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const clearUploads = useCallback(() => {
    setUploads([]);
  }, []);

  return { uploads, isUploading, uploadFile, uploadFiles, removeUpload, clearUploads };
}
