import { useState, useCallback } from "react";
import { UploadButton } from "./UploadButton";
import { ImageCard } from "./ImageCard";
import { AmbassadorImage } from "../../types";
import { ambassadorApi } from "../../services/api"; // We'll update this next
import { useToast } from "@/hooks/use-toast";

interface GalleryProps {
  ambassadorId: string;
  images: AmbassadorImage[];
  onImagesChange: () => void;
}

export function Gallery({ ambassadorId, images, onImagesChange }: GalleryProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  // Mock upload implementation for now (handled in API service)
  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // 1. Upload media (mocked or real)
      const mediaId = await ambassadorApi.uploadMedia(file);
      
      // 2. Link to ambassador
      await ambassadorApi.linkAmbassadorImage(ambassadorId, mediaId);
      
      toast({
        title: "Image uploaded",
        description: "Your image has been added effectively.",
      });
      
      // 3. Refresh gallery
      onImagesChange();
    } catch (error) {
       console.error("Upload error:", error);
       toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      await ambassadorApi.deleteAmbassadorImage(ambassadorId, imageId);
      
      toast({
        title: "Image deleted",
        description: "The image has been removed from the gallery.",
      });
      
      onImagesChange();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete image. Please try again.",
      });
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
      {/* Upload Button always first */}
      <UploadButton onUpload={handleUpload} isLoading={isUploading} />
      
      {/* Image Cards */}
      {images.map((image) => (
        <ImageCard
          key={image.id}
          id={image.id}
          url={image.imageUrl}
          onDelete={() => handleDelete(image.id)}
        />
      ))}
      
      {images.length === 0 && !isUploading && (
        <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
            <p className="text-lg font-medium">No images yet</p>
            <p className="text-sm mt-1">Upload images to showcase this ambassador</p>
        </div>
      )}
    </div>
  );
}
