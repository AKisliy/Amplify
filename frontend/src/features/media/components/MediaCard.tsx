"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Film, AlertCircle, CheckCircle2, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AmplifyImage } from "@/features/media/components/AmplifyImage";
import type { UploadedMedia } from "@/features/media/useMediaUpload";

interface MediaCardProps {
  media: UploadedMedia;
  onDelete?: (id: string) => void;
  onOpen?: (id: string) => void;
  className?: string;
}

export function MediaCard({ media, onDelete, onOpen, className }: MediaCardProps) {
  const isUploading = media.progress !== undefined && media.progress < 100;
  const hasError = !!media.error;
  const isReady = !isUploading && !hasError;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/40 cursor-pointer",
        className
      )}
      onClick={() => isReady && onOpen?.(media.id)}
    >
      {/* Media preview */}
      {media.type === "video" ? (
        <video
          src={media.url}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
          onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
          onMouseLeave={(e) => {
            const v = e.currentTarget as HTMLVideoElement;
            v.pause();
            v.currentTime = 0;
          }}
        />
      ) : (
        <AmplifyImage
          src={media.url}
          tinyUrl={media.tinyUrl}
          alt={media.name || "Ambassador gallery media"}
          sizes="(max-width: 768px) 50vw, 25vw"
          className="transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {/* Video badge */}
      {media.type === "video" && isReady && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-white text-[10px] font-medium backdrop-blur-sm pointer-events-none">
          <Film className="w-3 h-3" />
          Video
        </div>
      )}

      {/* Upload progress overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md"
          >
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5" className="stroke-muted" />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                strokeWidth="2.5"
                className="stroke-primary transition-all duration-300"
                strokeDasharray={`${media.progress} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="mt-1 text-xs font-semibold text-foreground">{media.progress}%</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error overlay */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/20 backdrop-blur-sm p-2"
          >
            <AlertCircle className="w-6 h-6 text-destructive" />
            <p className="text-[10px] text-center text-destructive font-medium leading-tight">
              {media.error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success tick flash */}
      <AnimatePresence>
        {media.progress === 100 && !hasError && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 1, duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm pointer-events-none"
          >
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover overlay + expand & delete */}
      {isReady && (
        <>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 pointer-events-none" />

          {/* Expand button (center on hover) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2.5 shadow-lg">
              <Expand className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Delete button (top-right) */}
          {onDelete && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100 shadow-md z-10"
              onClick={(e) => {
                e.stopPropagation(); // don't open lightbox when deleting
                onDelete(media.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </>
      )}
    </motion.div>
  );
}
