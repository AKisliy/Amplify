import axios from "axios";
import api from "@/lib/axios";

export interface MediaUploadResult {
  mediaId: string;
  contentType: string;
}

export type MediaType = "image" | "video";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];

export const IMAGE_MAX_MB = 10;
export const VIDEO_MAX_MB = 100;

export function detectMediaType(file: File): MediaType {
  if (VIDEO_TYPES.includes(file.type)) return "video";
  return "image";
}

export function validateFile(file: File): string | null {
  const type = detectMediaType(file);
  if (type === "image") {
    if (!IMAGE_TYPES.includes(file.type)) {
      return "Unsupported image format. Use JPEG, PNG, WebP, or GIF.";
    }
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
      return `Image exceeds ${IMAGE_MAX_MB} MB limit.`;
    }
  } else {
    if (!VIDEO_TYPES.includes(file.type)) {
      return "Unsupported video format. Use MP4 or WebM.";
    }
    if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
      return `Video exceeds ${VIDEO_MAX_MB} MB limit.`;
    }
  }
  return null;
}

export const mediaApi = {
  /**
   * Upload any media file via presigned URL (direct-to-S3).
   * Step 1: POST /api/media/presigned-upload → { mediaId, uploadUrl }
   * Step 2: PUT <uploadUrl> with raw file bytes
   */
  async uploadFile(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<MediaUploadResult & { type: MediaType }> {
    const type = detectMediaType(file);

    const { data } = await api.post<{ mediaId: string; uploadUrl: string }>(
      "media/presigned-upload",
      { fileName: file.name, contentType: file.type, fileSize: file.size }
    );

    await axios.put(data.uploadUrl, file, {
      headers: { "Content-Type": file.type },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });

    return { mediaId: data.mediaId, contentType: file.type, type };
  },

  /**
   * Get the public URL for a media item.
   * Use this as the src for <img> or <video> tags directly.
   */
  getMediaUrl(mediaId: string): string {
    const envUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "https://staging.alexeykiselev.tech";
    return `${envUrl}/media/api/media/${mediaId}`;
  },
};
