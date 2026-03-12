"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, Film, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFile } from "@/features/media/api";

interface MediaDropzoneProps {
  onFiles: (files: File[]) => void;
  isUploading?: boolean;
  /** Whether to accept videos in addition to images */
  acceptVideo?: boolean;
  maxFiles?: number;
  className?: string;
}

export function MediaDropzone({
  onFiles,
  isUploading = false,
  acceptVideo = true,
  maxFiles = 20,
  className,
}: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  const accept = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    ...(acceptVideo ? ["video/mp4", "video/webm"] : []),
  ].join(",");

  const processFiles = useCallback(
    (rawFiles: File[]) => {
      setDragError(null);
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of rawFiles.slice(0, maxFiles)) {
        const err = validateFile(file);
        if (err) errors.push(`${file.name}: ${err}`);
        else valid.push(file);
      }

      if (errors.length) setDragError(errors[0]);
      if (valid.length) onFiles(valid);
    },
    [onFiles, maxFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    processFiles(files);
    e.target.value = "";
  };

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        animate={{
          borderColor: isDragging
            ? "hsl(var(--primary))"
            : "hsl(var(--border))",
          backgroundColor: isDragging
            ? "hsl(var(--primary) / 0.06)"
            : "hsl(var(--muted) / 0.2)",
          scale: isDragging ? 1.01 : 1,
        }}
        transition={{ duration: 0.15 }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-12 text-center cursor-pointer transition-all select-none",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Icon ring */}
        <motion.div
          animate={{ scale: isDragging ? 1.15 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-inner"
        >
          <Upload className="w-7 h-7 text-primary" />
        </motion.div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {isDragging ? "Release to upload" : "Drag & drop files here"}
          </p>
          <p className="text-xs text-muted-foreground">
            or{" "}
            <span className="text-primary underline underline-offset-2 cursor-pointer">
              click to browse
            </span>
          </p>
        </div>

        {/* Accepted formats badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border/50">
            <ImageIcon className="w-3 h-3" /> JPEG, PNG, WebP, GIF · 10 MB
          </span>
          {acceptVideo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border/50">
              <Film className="w-3 h-3" /> MP4, WebM · 100 MB
            </span>
          )}
        </div>

        {/* Drag highlight border glow */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-2xl ring-2 ring-primary/40 pointer-events-none"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {dragError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            <span className="flex-1">{dragError}</span>
            <button onClick={() => setDragError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
