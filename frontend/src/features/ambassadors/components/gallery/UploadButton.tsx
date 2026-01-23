import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyPlus, Loader2 } from "lucide-react";
import { useRef } from "react";

interface UploadButtonProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function UploadButton({
  onUpload,
  isLoading = false,
  className,
}: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
      // Reset input so the same file can be selected again if needed
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      
      <Button
        variant="outline"
        className={cn(
          "w-full h-full aspect-square flex flex-col items-center justify-center border-dashed border-2 hover:border-solid hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 group",
          className
        )}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="rounded-full bg-muted p-3 group-hover:scale-110 transition-transform duration-200">
              <CopyPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="mt-2 text-sm font-medium text-muted-foreground">
              Add Image
            </span>
          </>
        )}
      </Button>
    </>
  );
}
