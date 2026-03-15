// =============================================================================
// Node Registry
// Imports all Amplify node schemas and exposes a typed, unified registry.
// =============================================================================

import type { NodeSchemaRegistry, NodeSchemaDef, NodeLibraryItem, NodeCategory } from "../types";
import { PREVIEW_SCHEMAS } from "./preview-schemas";

// ---------------------------------------------------------------------------
// Raw JSON imports (the 6 schema files in TempMockData)
// ---------------------------------------------------------------------------

import GeminiNodeAmplifyRaw from "../../../../TempMockData/GeminiNodeAmplify.json";
import GeminiImageNodeAmplifyRaw from "../../../../TempMockData/GeminiImageNodeAmplify.json";
import GeminiImage2NodeAmplifyRaw from "../../../../TempMockData/GeminiImage2NodeAmplify.json";
import Veo3VideoGenerationNodeAmplifyRaw from "../../../../TempMockData/Veo3VideoGenerationNodeAmplify.json";
import VeoVideoGenerationNodeAmplifyRaw from "../../../../TempMockData/VeoVideoGenerationNodeAmplify.json";
import Veo3FirstLastFrameNodeAmplifyRaw from "../../../../TempMockData/Veo3FirstLastFrameNodeAmplify.json";

// ---------------------------------------------------------------------------
// Build the registry by merging all JSON objects into one record.
// Each JSON file has the schema name as its top-level key.
// ---------------------------------------------------------------------------

const rawRegistry: Record<string, unknown> = {
  ...GeminiNodeAmplifyRaw,
  ...GeminiImageNodeAmplifyRaw,
  ...GeminiImage2NodeAmplifyRaw,
  ...Veo3VideoGenerationNodeAmplifyRaw,
  ...VeoVideoGenerationNodeAmplifyRaw,
  ...Veo3FirstLastFrameNodeAmplifyRaw,
  ...PREVIEW_SCHEMAS,
};

/**
 * The typed node schema registry.
 * Keys are the ComfyUI class names (e.g. "GeminiNodeAmplify").
 */
export const NODE_REGISTRY: NodeSchemaRegistry =
  rawRegistry as NodeSchemaRegistry;

// ---------------------------------------------------------------------------
// Category resolution helpers
// ---------------------------------------------------------------------------

/** Map a raw category string to one of our normalised category tags */
export function resolveCategoryTag(category: string): NodeCategory {
  const lower = category.toLowerCase();
  if (lower.includes("output") || lower.includes("preview")) return "utility";
  if (lower.includes("video")) return "video";
  if (lower.includes("image")) return "image";
  if (lower.includes("text")) return "text";
  return "utility";
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/**
 * Look up a single node definition by its schema name.
 * Returns `undefined` if the name is not in the registry.
 */
export function getNodeDef(schemaName: string): NodeSchemaDef | undefined {
  return NODE_REGISTRY[schemaName];
}

/**
 * Returns every registered node as a NodeLibraryItem array,
 * ready to be displayed in the sidebar / context menu.
 */
export function getNodeLibrary(): NodeLibraryItem[] {
  return Object.entries(NODE_REGISTRY).map(([schemaName, def]) => ({
    schemaName,
    displayName: def.display_name,
    description: def.description,
    category: def.category,
    categoryTag: resolveCategoryTag(def.category),
  }));
}

/**
 * Returns all schema names grouped by their normalised category tag.
 */
export function getNodesByCategory(): Record<NodeCategory, NodeLibraryItem[]> {
  const result: Record<NodeCategory, NodeLibraryItem[]> = {
    text: [],
    image: [],
    video: [],
    utility: [],
  };
  for (const item of getNodeLibrary()) {
    result[item.categoryTag].push(item);
  }
  return result;
}
