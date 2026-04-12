"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { mediaApi } from "@/features/media/api";

export type MediaVariant = "Tiny" | "Medium" | "Original";

interface AmplifyImageProps {
  /**
   * Media UUID — component resolves /media/{id}?variant=... automatically.
   * Use this when displaying media managed by media-ingest.
   */
  mediaId?: string;

  /**
   * Direct URL — use when the URL is already resolved externally
   * (e.g. asset pages that receive mediaUrl directly from the backend).
   * When provided, mediaId is ignored.
   */
  src?: string;

  /**
   * Which variant to display. Only applies when mediaId is provided.
   * Defaults to "medium" — the preprocessed thumbnail for fast loading.
   */
  variant?: MediaVariant;

  /**
   * Override the tiny URL used as blur placeholder.
   * Auto-resolved from mediaId if not provided.
   */
  tinyUrl?: string;

  /** Open a fullscreen viewer on click. Default: false. */
  lightbox?: boolean;

  alt?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  /**
   * Responsive sizes hint for next/image.
   * Defaults to a sensible gallery value — override for hero/full-width images.
   */
  sizes?: string;
}

function LightboxPortal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image — stop propagation so clicking image doesn't close */}
        <div
          className="relative max-w-[90vw] max-h-[90vh] w-full h-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="mx-auto max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export function AmplifyImage({
  mediaId,
  src,
  variant = "Medium",
  tinyUrl,
  lightbox = false,
  alt = "",
  className,
  sizes = "(max-width: 768px) 50vw, 25vw",
  onLoad,
  onError,
}: AmplifyImageProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const resolvedSrc = src ?? (mediaId ? mediaApi.getMediaUrl(mediaId, variant) : "");
  const resolvedTiny = tinyUrl ?? (mediaId ? mediaApi.getMediaUrl(mediaId, "Tiny") : undefined);
  // For the lightbox always show original quality
  const lightboxSrc = src ?? (mediaId ? mediaApi.getMediaUrl(mediaId, "Original") : resolvedSrc);

  if (!resolvedSrc) return null;

  return (
    <>
      <Image
        src={resolvedSrc}
        alt={alt}
        fill
        sizes={sizes}
        className={cn(
          "object-cover",
          lightbox && "cursor-zoom-in",
          className
        )}
        blurDataURL={resolvedTiny}
        placeholder={resolvedTiny ? "blur" : "empty"}
        onClick={lightbox ? () => setLightboxOpen(true) : undefined}
        onLoad={onLoad}
        onError={onError}
      />

      {lightboxOpen && (
        <LightboxPortal
          src={lightboxSrc}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
