"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { User, Edit, Trash2, Plus, Camera } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mediaApi } from "@/features/media/api";

import type { Ambassador } from "../types";
import { AmbassadorDialog } from "./AmbassadorDialog";
import { CropAvatarDialog } from "./CropAvatarDialog";
import type { AmbassadorFormValues } from "../schemas/ambassador.schema";
import { Gallery } from "./gallery/Gallery";

interface AmbassadorViewProps {
  ambassador: Ambassador | null;
  projectName: string;
  isLoading: boolean;
  onCreateAmbassador: (values: AmbassadorFormValues) => Promise<void>;
  onUpdateAmbassador: (values: AmbassadorFormValues) => Promise<void>;
  onDeleteAmbassador: () => Promise<void>;
  onAvatarUpload?: (blob: Blob) => Promise<void>;
  onImagesChange: () => void;
}

export function AmbassadorView({
  ambassador,
  projectName,
  isLoading,
  onCreateAmbassador,
  onUpdateAmbassador,
  onDeleteAmbassador,
  onAvatarUpload,
  onImagesChange,
}: AmbassadorViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleCropConfirm = useCallback(async (blob: Blob) => {
    if (!onAvatarUpload) return;
    const previewUrl = URL.createObjectURL(blob);
    setAvatarPreview(previewUrl);
    await onAvatarUpload(blob);
  }, [onAvatarUpload]);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this ambassador?")) return;
    setIsDeleting(true);
    try {
      await onDeleteAmbassador();
    } finally {
      setIsDeleting(false);
    }
  };

  // Derive avatar URL from reference_images (prefer portrait, fallback to first)
  const avatarImage = ambassador?.reference_images.find((img) => img.image_type === "portrait")
    ?? ambassador?.reference_images[0];
  const avatarUrl = avatarPreview ?? (avatarImage ? mediaApi.getMediaUrl(avatarImage.media_id) : undefined);

  if (!ambassador && !isLoading) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 px-4"
        >
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">No Ambassador Yet</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            This project doesn't have an ambassador. Create one to get started.
          </p>
          <Button onClick={() => setDialogOpen(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Create Ambassador
          </Button>
        </motion.div>

        <AmbassadorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={onCreateAmbassador}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header card */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Change profile photo"
                >
                  <Avatar className="w-20 h-20 border-2 border-border shadow-sm">
                    <AvatarImage src={avatarUrl} className="object-cover" alt={ambassador!.name} />
                    <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                      {getInitials(ambassador!.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </span>
                </button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{ambassador!.name}</h1>
                  <p className="text-muted-foreground mt-1">Ambassador for {projectName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* AI info section */}
        {(ambassador!.appearance_description || ambassador!.voice_description || ambassador!.voice_id) && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
                Generation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ambassador!.appearance_description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Appearance</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {ambassador!.appearance_description}
                  </p>
                </div>
              )}

              {ambassador!.appearance_description && ambassador!.voice_description && (
                <Separator />
              )}

              {ambassador!.voice_description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Voice Style</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {ambassador!.voice_description}
                  </p>
                </div>
              )}

              {(ambassador!.appearance_description || ambassador!.voice_description) && ambassador!.voice_id && (
                <Separator />
              )}

              {ambassador!.voice_id && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Voice ID</p>
                  <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                    {ambassador!.voice_id}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reference images gallery */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              Reference Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Gallery
              ambassadorId={ambassador!.id}
              images={ambassador!.reference_images}
              onImagesChange={onImagesChange}
            />
          </CardContent>
        </Card>
      </motion.div>

      <AmbassadorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={onUpdateAmbassador}
        ambassador={ambassador}
      />

      {cropSrc && (
        <CropAvatarDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
        />
      )}
    </>
  );
}
