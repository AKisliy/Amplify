"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Edit, Trash2, Plus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import type { Ambassador } from "../types";
import { AmbassadorDialog } from "./AmbassadorDialog";
import type { AmbassadorFormValues } from "../schemas/ambassador.schema";
import { Gallery } from "./gallery/Gallery";
import { useAmbassadorImages } from "../hooks/useAmbassadorImages";
import { InstagramConnection } from "@/features/integrations/components/InstagramConnection";

interface AmbassadorViewProps {
  ambassador: Ambassador | null;
  projectName: string;
  projectId: string;
  isLoading: boolean;
  onCreateAmbassador: (values: AmbassadorFormValues) => Promise<void>;
  onUpdateAmbassador: (values: AmbassadorFormValues) => Promise<void>;
  onDeleteAmbassador: () => Promise<void>;
}

export function AmbassadorView({
  ambassador,
  projectName,
  projectId,
  isLoading,
  onCreateAmbassador,
  onUpdateAmbassador,
  onDeleteAmbassador,
}: AmbassadorViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
                <Avatar className="w-20 h-20 border-2 border-border shadow-sm">
                  <AvatarImage src={images && images.length > 0 ? images[0].imageUrl : undefined} className="object-cover" />
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                    {getInitials(ambassador!.name)}
                  </AvatarFallback>
                </Avatar>
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
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="bio">Bio</TabsTrigger>
            <TabsTrigger value="images" disabled={!ambassador}>
              Images
            </TabsTrigger>
            <TabsTrigger value="integrations" disabled={!ambassador}>
              Integrations
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

          <TabsContent value="integrations" className="mt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Social Media Connections</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect social media accounts to enable content publishing for this project.
                </p>
              </div>
              <InstagramConnection projectId={projectId} />
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      <AmbassadorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={onUpdateAmbassador}
        ambassador={ambassador}
      />
    </>
  );
}
