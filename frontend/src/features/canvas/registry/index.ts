// =============================================================================
// Node Registry
// Helpers for working with a NodeSchemaRegistry loaded at runtime.
// =============================================================================

import type { NodeSchemaRegistry, NodeSchemaDef, NodeLibraryItem, NodeCategory } from "../types";

export { PREVIEW_SCHEMAS } from "./preview-schemas";

// ---------------------------------------------------------------------------
// Category resolution
// ---------------------------------------------------------------------------

/** Map a raw category string to one of our normalised category tags */
export function resolveCategoryTag(category: string): NodeCategory {
  const lower = category.toLowerCase();
  if (lower.includes("manual")) return "manual";
  if (lower.includes("output") || lower.includes("preview")) return "utility";
  if (lower.includes("publish") || lower.includes("amplify")) return "utility";
  if (lower.includes("video")) return "video";
  if (lower.includes("image")) return "image";
  if (lower.includes("text")) return "text";
  return "utility";
}

// ---------------------------------------------------------------------------
// Accessors (all accept a runtime registry)
// ---------------------------------------------------------------------------

export function getNodeDef(
  registry: NodeSchemaRegistry,
  schemaName: string
): NodeSchemaDef | undefined {
  return registry[schemaName];
}

export function getNodeLibrary(registry: NodeSchemaRegistry): NodeLibraryItem[] {
  return Object.entries(registry).map(([schemaName, def]) => ({
    schemaName,
    displayName: def.display_name,
    description: def.description,
    category: def.category,
    categoryTag: resolveCategoryTag(def.category),
  }));
}

export function getNodesByCategory(
  registry: NodeSchemaRegistry
): Record<NodeCategory, NodeLibraryItem[]> {
  const result: Record<NodeCategory, NodeLibraryItem[]> = {
    text: [],
    image: [],
    video: [],
    utility: [],
    manual: []
  };
  for (const item of getNodeLibrary(registry)) {
    result[item.categoryTag].push(item);
  }
  return result;
}