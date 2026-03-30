import { useState, useEffect } from "react";
import { getAllNodesV1EngineNodesGet } from "@/lib/api/template-service";
import { PREVIEW_SCHEMAS } from "../registry/preview-schemas";
import type { NodeSchemaRegistry } from "../types";

interface UseNodeRegistryResult {
  registry: NodeSchemaRegistry;
  isLoading: boolean;
  error: string | null;
}

export function useNodeRegistry(): UseNodeRegistryResult {
  const [registry, setRegistry] = useState<NodeSchemaRegistry>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllNodesV1EngineNodesGet()
      .then(({ data }) => {
        const remote = (data ?? {}) as NodeSchemaRegistry;
        setRegistry({ ...remote, ...PREVIEW_SCHEMAS });
      })
      .catch((err) => {
        console.error("Failed to load node registry:", err);
        setError("Failed to load nodes");
        // Fall back to preview schemas only so the canvas is still usable
        setRegistry({ ...PREVIEW_SCHEMAS });
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { registry, isLoading, error };
}