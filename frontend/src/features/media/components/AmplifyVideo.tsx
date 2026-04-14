"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Play, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { mediaApi } from "@/features/media/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * How the video reacts to user interaction:
 *
 * - `"hover-play"` — muted autoplay on pointer enter, pause+rewind on leave.
 *   Great for thumbnails / gallery cards.
 * - `"click-play"` — shows a play-button overlay; user clicks to play in place.
 *   Ideal for asset detail pages.
 * - `"controls"` — native <video controls>. Best for preview nodes.
 */
export type VideoMode = "hover-play" | "click-play" | "controls";

export interface AmplifyVideoProps {
  /**
   * Media UUID — component resolves /media/{id} automatically.
   * Use this when displaying media managed by media-ingest.
   */
  mediaId?: string;

  /**
   * Direct URL — use when the URL is already resolved externally.
   * When provided, mediaId is ignored.
   */
  src?: string;

  /**
   * Media UUID to use as the video poster / thumbnail.
   * Auto-resolved to the "Medium" variant.
   */
  thumbnailId?: string;

  /**
   * Direct URL for the poster image.
   * When provided, thumbnailId is ignored.
   */
  thumbnailSrc?: string;

  /**
   * Interaction mode. Defaults to `"click-play"`.
   */
  mode?: VideoMode;

  /**
   * Open a fullscreen player on click.
   * Only applies when mode is `"click-play"` or `"hover-play"`.
   * When true, clicking opens the lightbox instead of playing in place.
   */
  lightbox?: boolean;

  /** Mute the video. Default: true for `hover-play`, false otherwise. */
  muted?: boolean;

  /** Loop the video. Default: false. */
  loop?: boolean;

  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPoster(
  thumbnailId?: string,
  thumbnailSrc?: string
): string | undefined {
  if (thumbnailSrc) return thumbnailSrc;
  if (thumbnailId) return mediaApi.getMediaUrl(thumbnailId, "Medium");
  return undefined;
}

// ---------------------------------------------------------------------------
// Lightbox Portal
// ---------------------------------------------------------------------------

function VideoLightboxPortal({
  src,
  poster,
  onClose,
}: {
  src: string;
  poster?: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Auto-play when portal opens
  useEffect(() => {
    videoRef.current?.play().catch(() => {
      /* autoplay may be blocked — user can click Play */
    });
  }, []);

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
          className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors z-10"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Mute toggle */}
        <button
          className="absolute top-4 right-16 flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
        >
          {muted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        {/* Video — stop propagation so clicking it doesn't close */}
        <div
          className="relative max-w-[90vw] max-h-[90vh] w-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            muted={muted}
            controls
            playsInline
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl bg-black"
          />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// HoverPlay implementation
// ---------------------------------------------------------------------------

function HoverPlayVideo({
  src,
  poster,
  muted,
  loop,
  lightbox,
  className,
  onLoad,
  onError,
}: {
  src: string;
  poster?: string;
  muted: boolean;
  loop: boolean;
  lightbox: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleMouseEnter = () => {
    if (lightbox) return; // don't autoplay if click opens lightbox
    videoRef.current?.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    if (lightbox) return;
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  const handleClick = () => {
    if (lightbox) setLightboxOpen(true);
  };

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        loop={loop}
        playsInline
        preload="metadata"
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          lightbox && "cursor-zoom-in",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onLoadedData={onLoad}
        onError={onError}
      />

      {lightboxOpen && (
        <VideoLightboxPortal
          src={src}
          poster={poster}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// ClickPlay implementation
// ---------------------------------------------------------------------------

function ClickPlayVideo({
  src,
  poster,
  muted,
  loop,
  lightbox,
  className,
  onLoad,
  onError,
}: {
  src: string;
  poster?: string;
  muted: boolean;
  loop: boolean;
  lightbox: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleClick = () => {
    if (lightbox) {
      setLightboxOpen(true);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          "absolute inset-0 h-full w-full cursor-pointer",
          className
        )}
        onClick={handleClick}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted={muted}
          loop={loop}
          playsInline
          preload="metadata"
          controls={false}
          className="h-full w-full object-cover"
          onLoadedData={onLoad}
          onError={onError}
          onEnded={() => setPlaying(false)}
        />

        {/* Play / Pause overlay */}
        <AnimatePresence>
          {!playing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/80 hover:scale-110 transition-all duration-200">
                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {lightboxOpen && (
        <VideoLightboxPortal
          src={src}
          poster={poster}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Controls implementation
// ---------------------------------------------------------------------------

function ControlsVideo({
  src,
  poster,
  muted,
  loop,
  className,
  onLoad,
  onError,
}: {
  src: string;
  poster?: string;
  muted: boolean;
  loop: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}) {
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      src={src}
      poster={poster}
      muted={muted}
      loop={loop}
      controls
      playsInline
      preload="metadata"
      className={cn("absolute inset-0 h-full w-full object-contain", className)}
      onLoadedData={onLoad}
      onError={onError}
    />
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * Unified video component for the Amplify frontend.
 *
 * Mirrors the `AmplifyImage` API:
 * - Accepts either a `mediaId` (resolved via media-ingest proxy) or a direct `src`.
 * - Accepts an optional `thumbnailId` / `thumbnailSrc` for the poster frame.
 * - Three interaction modes: `"hover-play"`, `"click-play"` (default), `"controls"`.
 * - Optional `lightbox` prop to open a fullscreen player portal.
 *
 * @example
 * // Gallery card — hover to preview
 * <AmplifyVideo mediaId={item.mediaId} mode="hover-play" />
 *
 * // Asset detail — click to play with fullscreen option
 * <AmplifyVideo mediaId={asset.mediaId} mode="click-play" lightbox />
 *
 * // Canvas preview node — native controls
 * <AmplifyVideo src={resolvedUrl} mode="controls" />
 */
export function AmplifyVideo({
  mediaId,
  src,
  thumbnailId,
  thumbnailSrc,
  mode = "click-play",
  lightbox = false,
  muted,
  loop = false,
  className,
  onLoad,
  onError,
}: AmplifyVideoProps) {
  const resolvedSrc = src ?? (mediaId ? mediaApi.getMediaUrl(mediaId, "Original") : "");
  const poster = buildPoster(thumbnailId, thumbnailSrc);

  // Sensible muted default per mode
  const effectiveMuted = muted ?? (mode === "hover-play" ? true : false);

  if (!resolvedSrc) return null;

  const sharedProps = {
    src: resolvedSrc,
    poster,
    muted: effectiveMuted,
    loop,
    className,
    onLoad,
    onError,
  };

  if (mode === "hover-play") {
    return <HoverPlayVideo {...sharedProps} lightbox={lightbox} />;
  }

  if (mode === "controls") {
    return <ControlsVideo {...sharedProps} />;
  }

  // Default: "click-play"
  return <ClickPlayVideo {...sharedProps} lightbox={lightbox} />;
}
