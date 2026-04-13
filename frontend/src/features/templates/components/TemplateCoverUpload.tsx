"use client";

// =============================================================================
// TemplateCoverUpload — avatar-style cover image picker for a template
// Uploads the image as base64 and saves it via PATCH thumbnail_url field.
// =============================================================================

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, Image as ImageIcon, X } from "lucide-react";
import { updateTemplateV1TemplatesTemplateIdPatch } from "@/lib/api/template-service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LS_KEY = (id: string) => `template-cover-${id}`;

/** Read stored cover URL (localStorage fallback) */
export function getStoredCover(templateId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_KEY(templateId));
}

/** Convert a File to a base64 data-URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TemplateCoverUploadProps {
  templateId: string;
  /** Initial cover URL (from API or localStorage) */
  initialCoverUrl?: string | null;
  disabled?: boolean;
  className?: string;
}

export function TemplateCoverUpload({
  templateId,
  initialCoverUrl,
  disabled,
  className,
}: TemplateCoverUploadProps) {
  const inputRef           = useRef<HTMLInputElement>(null);
  const { toast }          = useToast();
  const [hovered, setHovered]   = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(
    initialCoverUrl ?? getStoredCover(templateId)
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate
      if (!file.type.startsWith("image/")) {
        toast({ variant: "destructive", title: "Please select an image file.", duration: 3000 });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Image must be under 5 MB.", duration: 3000 });
        return;
      }

      setIsUploading(true);
      try {
        const dataUrl = await fileToBase64(file);

        // Optimistically show the cover
        setCoverUrl(dataUrl);
        localStorage.setItem(LS_KEY(templateId), dataUrl);

        // PATCH to backend — thumbnail_url is not in the generated type yet,
        // so we cast body to `any` to include it.
        await updateTemplateV1TemplatesTemplateIdPatch({
          path: { template_id: templateId },
          body: { thumbnail_url: dataUrl } as any,
        });

        toast({ title: "Cover updated!", duration: 3000 });
      } catch (err) {
        console.error("Cover upload failed:", err);
        toast({
          variant: "destructive",
          title: "Cover upload failed",
          description: "Cover saved locally, but couldn't sync to server.",
          duration: 4000,
        });
      } finally {
        setIsUploading(false);
        // Reset input so the same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [templateId, toast]
  );

  const handleRemove = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setCoverUrl(null);
      localStorage.removeItem(LS_KEY(templateId));
      try {
        await updateTemplateV1TemplatesTemplateIdPatch({
          path: { template_id: templateId },
          body: { thumbnail_url: null } as any,
        });
      } catch {
        // best-effort
      }
    },
    [templateId]
  );

  return (
    <div
      className={cn("relative group shrink-0", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {/* Clickable avatar button */}
      <motion.button
        id="btn-template-cover-upload"
        aria-label="Upload template cover image"
        disabled={disabled || isUploading}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        whileHover={!disabled ? { scale: 1.03 } : {}}
        whileTap={!disabled ? { scale: 0.97 } : {}}
        className={cn(
          "relative w-12 h-12 rounded-xl overflow-hidden border border-white/10",
          "bg-white/[0.04] flex items-center justify-center",
          "transition-colors duration-150 focus:outline-none",
          !disabled && "cursor-pointer hover:border-white/20"
        )}
      >
        {/* Cover image */}
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt="Template cover"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <ImageIcon className="w-5 h-5 text-white/20" />
        )}

        {/* Overlay on hover */}
        <AnimatePresence>
          {(hovered || isUploading) && !disabled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-0.5"
              style={{
                background: "rgba(0,0,0,0.62)",
                backdropFilter: "blur(2px)",
              }}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
              ) : (
                <>
                  <Camera className="w-4 h-4 text-white/80" />
                  <span className="text-[8px] text-white/60 leading-none font-medium">
                    {coverUrl ? "Change" : "Upload"}
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Remove button — appears top-right on hover when cover exists */}
      <AnimatePresence>
        {coverUrl && hovered && !disabled && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.12 }}
            onClick={handleRemove}
            aria-label="Remove cover image"
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shadow-md z-10"
          >
            <X className="w-2.5 h-2.5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
