import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

interface ImageCardProps {
  id: string;
  url: string;
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

export function ImageCard({ id, url, onDelete, className }: ImageCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Failed to delete image:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div className={cn(
      "group relative aspect-square rounded-xl overflow-hidden bg-muted transition-all hover:shadow-md",
      className
    )}>
      <Image
        src={url}
        alt="Ambassador image"
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, 33vw"
      />
      
      {/* Overlay gradient for text readability (subtle) */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

      {/* Delete button - appears on hover */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 scale-95 group-hover:scale-100 shadow-sm"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      
      {isDeleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
