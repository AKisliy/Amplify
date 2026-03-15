"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { User, Edit, Trash2, Plus, Camera } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import type { Ambassador } from "../types";
import { AmbassadorDialog } from "./AmbassadorDialog";
import { CropAvatarDialog } from "./CropAvatarDialog";
import type { AmbassadorFormValues } from "../schemas/ambassador.schema";
import { Gallery } from "./gallery/Gallery";
import { useAmbassadorImages } from "../hooks/useAmbassadorImages";

interface AmbassadorViewProps {
  ambassador: Ambassador | null;
  projectName: string;
  isLoading: boolean;
  onCreateAmbassador: (values: AmbassadorFormValues) => Promise<void>;
  onUpdateAmbassador: (values: AmbassadorFormValues) => Promise<void>;
  onDeleteAmbassador: () => Promise<void>;
  onAvatarUpload?: (blob: Blob) => Promise<void>;
}

export function AmbassadorView({
  ambassador,
  projectName,
  isLoading,
  onCreateAmbassador,
  onUpdateAmbassador,
  onDeleteAmbassador,
  onAvatarUpload,
}: AmbassadorViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Avatar upload state
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
    // reset so the same file can be re-selected
    e.target.value = "";
  }, []);

  const handleCropConfirm = useCallback(async (blob: Blob) => {
    if (!onAvatarUpload) return;
    // Optimistic preview
    const previewUrl = URL.createObjectURL(blob);
    setAvatarPreview(previewUrl);
    await onAvatarUpload(blob);
  }, [onAvatarUpload]);

  // Use the hook to get images if ambassador exists
  const { images, refreshImages } = useAmbassadorImages(ambassador?.id);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this ambassador?")) return;
    
    setIsDeleting(true);
    try {
      await onDeleteAmbassador();
    } finally {
      setIsDeleting(false);
    }
  };

  // Empty state when no ambassador exists
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Ambassador exists - show full view
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header Card */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Clickable avatar */}
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Change profile photo"
                >
                  <Avatar className="w-20 h-20 border-2 border-border shadow-sm">
                    <AvatarImage
                      src={avatarPreview ?? ambassador!.profileImageUrl ?? undefined}
                      className="object-cover"
                      alt={ambassador!.name}
                    />
                    <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                      {getInitials(ambassador!.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Camera overlay */}
                  <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </span>
                </button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {ambassador!.name}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Ambassador for {projectName}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
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

        {/* Tabs Section */}
        <Tabs defaultValue="bio" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bio">Bio</TabsTrigger>
            <TabsTrigger value="images" disabled={!ambassador}>
              Images
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bio" className="mt-6">
            <Card className="border-border/50">
              <CardContent className="pt-6 space-y-6">
                {ambassador!.biography && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Biography</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {ambassador!.biography}
                    </p>
                  </div>
                )}

                {ambassador!.biography && ambassador!.behavioralPatterns && (
                  <Separator />
                )}

                {ambassador!.behavioralPatterns && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Behavioral Patterns
                    </h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {ambassador!.behavioralPatterns}
                    </p>
                  </div>
                )}

                {!ambassador!.biography && !ambassador!.behavioralPatterns && (
                  <div className="text-center py-8 text-muted-foreground">
                    No additional information available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="mt-6">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                 {ambassador && (
                   <Gallery 
                     ambassadorId={ambassador.id} 
                     images={images || []} 
                     onImagesChange={refreshImages || (() => {})} 
                   />
                 )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
