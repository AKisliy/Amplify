import { useState, useCallback, useEffect } from "react";
import { ambassadorApi } from "../services/api";
import type { AmbassadorImage } from "../types";

export function useAmbassadorImages(ambassadorId?: string | null) {
  const [images, setImages] = useState<AmbassadorImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    if (!ambassadorId) {
      setImages([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await ambassadorApi.getAmbassadorImages(ambassadorId);
      setImages(data);
    } catch (err: any) {
      console.error("Failed to fetch ambassador images:", err);
      setError(err.message || "Failed to fetch images");
      setImages([]); // Fallback to empty array
    } finally {
      setIsLoading(false);
    }
  }, [ambassadorId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return {
    images,
    isLoading,
    error,
    refreshImages: fetchImages,
  };
}
