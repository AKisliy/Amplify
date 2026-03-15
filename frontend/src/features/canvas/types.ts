// =============================================================================
// Canvas Feature — TypeScript Types
// Phase 1: Schema-driven node-graph system
// =============================================================================

import type { Node, Edge, XYPosition } from "@xyflow/react";

// ---------------------------------------------------------------------------
// 1. Node Schema Input Types (mirrors ComfyUI JSON format)
// ---------------------------------------------------------------------------

/** Primitive type tags used in schema input definitions */
export type NodeInputPrimitive =
  | "STRING"
  | "INT"
  | "FLOAT"
  | "BOOLEAN"
  | "COMBO"
  | "COMFY_AUTOGROW_V3";

/** All possible port data types (inputs + outputs) */
export type NodePortType =
  | "STRING"
  | "INT"
  | "FLOAT"
  | "BOOLEAN"
  | "COMBO"
  | "IMAGE"
  | "VIDEO"
  | "COMFY_AUTOGROW_V3";

// --- Per-type config shapes ------------------------------------------------

export interface StringInputConfig {
  tooltip?: string;
  default?: string;
  multiline?: boolean;
  forceInput?: boolean;
  advanced?: boolean;
}

export interface IntInputConfig {
  tooltip?: string;
  default?: number;
  min?: number;
  max?: number;
  step?: number;
  display?: "number" | "slider";
  control_after_generate?: boolean;
  advanced?: boolean;
}

export type FloatInputConfig = IntInputConfig;

export interface BooleanInputConfig {
  tooltip?: string;
  default?: boolean;
  advanced?: boolean;
}

export interface ComboInputConfig {
  tooltip?: string;
  default?: string;
  options: string[];
  multiselect?: boolean;
  advanced?: boolean;
}

export interface AutogrowInputTemplate {
  input: {
    required: Record<string, NodeInputDef>;
    optional: Record<string, NodeInputDef>;
  };
  prefix: string;
  min: number;
  max: number;
}

export interface AutogrowInputConfig {
  tooltip?: string;
  template: AutogrowInputTemplate;
}

export type NodeInputConfig =
  | StringInputConfig
  | IntInputConfig
  | FloatInputConfig
  | BooleanInputConfig
  | ComboInputConfig
  | AutogrowInputConfig;

/**
 * A single input definition: a tuple of [type, config].
 * Matches the ComfyUI JSON schema format exactly.
 */
export type NodeInputDef = [NodeInputPrimitive, NodeInputConfig];

// ---------------------------------------------------------------------------
// 2. Node Schema Definition (the full JSON object shape)
// ---------------------------------------------------------------------------

export interface NodeSchemaDef {
  input: {
    required: Record<string, NodeInputDef>;
    optional?: Record<string, NodeInputDef>;
  };
  input_order?: {
    required?: string[];
    optional?: string[];
  };
  is_input_list?: boolean;
  output: NodePortType[];
  output_is_list: boolean[];
  output_name: string[];
  output_tooltips: (string | null)[];
  output_matchtypes: string[] | null;
  name: string;
  display_name: string;
  description: string;
  python_module: string;
  category: string;
  output_node: boolean;
  deprecated: boolean;
  experimental: boolean;
  dev_only: boolean;
  api_node: boolean;
  price_badge: string | null;
  search_aliases: string[] | null;
  essentials_category: string | null;
}

/** The full registry: schema name → definition */
export type NodeSchemaRegistry = Record<string, NodeSchemaDef>;

// ---------------------------------------------------------------------------
// 3. Resolved Port / Handle Definitions (used at runtime by ReactFlow nodes)
// ---------------------------------------------------------------------------

export type HandleDirection = "input" | "output";
export type HandleRequired = "required" | "optional";

/**
 * A resolved port — one handle on a ReactFlow node.
 * Created by parsing a NodeSchemaDef via schemaMapper.
 */
export interface PortDef {
  /** Unique handle ID within this node (e.g. "prompt", "image_uuid_0") */
  id: string;
  /** Human-readable label shown on the handle */
  label: string;
  /** Port data type — drives handle colour and connection compatibility */
  portType: NodePortType | NodeInputPrimitive;
  direction: HandleDirection;
  required: HandleRequired;
  /** The original config from the schema (for rendering inline widgets) */
  config: NodeInputConfig;
  tooltip?: string;
  /**
   * If true this port is rendered as an inline widget (e.g. text area,
   * number input, select) rather than a connectable handle.
   * forceInput:true overrides this to always show a handle.
   */
  isWidget: boolean;
  /** True when this port is part of a COMFY_AUTOGROW_V3 group */
  isAutogrowSlot?: boolean;
  /** Index within its autogrow group (0-based) */
  autogrowIndex?: number;
}

// ---------------------------------------------------------------------------
// 4. Canvas Node Data (stored in ReactFlow node.data)
// ---------------------------------------------------------------------------

export type NodeExecutionStatus =
  | "idle"
  | "queued"
  | "processing"
  | "success"
  | "error";

/** Category tag used for colour-coding and grouping in the node library */
export type NodeCategory = "text" | "image" | "video" | "utility";

export interface CanvasNodeData {
  // Index signature required by @xyflow/react Node<T extends Record<string, unknown>>
  [key: string]: unknown;
  /** The schema registry key (e.g. "GeminiNodeAmplify") */
  schemaName: string;
  /** Resolved display name from the schema */
  displayName: string;
  /** Full dot-path category string (e.g. "api node/text/Gemini") */
  category: string;
  /** Normalised short category for styling */
  categoryTag: NodeCategory;
  /** Current execution lifecycle state */
  status: NodeExecutionStatus;
  /** Current widget/config values keyed by input name */
  config: Record<string, unknown>;
  /** All resolved port definitions for this node */
  ports: PortDef[];
  /** Optional error message when status === "error" */
  errorMessage?: string;
  /** Output values populated after successful execution */
  outputValues?: Record<string, unknown>;
  // ---------------------------------------------------------------------------
  // Runtime callbacks — injected by the canvas page at render time.
  // Typed as unknown to satisfy the index signature; components cast them.
  // ---------------------------------------------------------------------------
  /** Called when an inline widget value changes: (field, value) → void */
  onUpdateConfig?: unknown;
  /** Called when the user clicks the node's delete button */
  onDeleteNode?: unknown;
}

/** Valid ReactFlow node type strings for the canvas */
export type CanvasNodeType = "amplify-node" | "preview-node" | "import-media-node";

/** A typed ReactFlow Node for the canvas */
export type CanvasNode = Node<CanvasNodeData, CanvasNodeType>;

/** A typed ReactFlow Edge for the canvas */
export type CanvasEdge = Edge<{ flowing?: boolean; error?: boolean }, "status">;

// ---------------------------------------------------------------------------
// 5. ComfyUI API — Request / Response Types
// ---------------------------------------------------------------------------

// --- Workflow endpoints ---

/**
 * A node payload entry inside POST /api/prompt.
 * Input values are either literals or node-link references [nodeId, outputIndex].
 */
export type PromptInputValue = string | number | boolean | [string, number];

export interface PromptNodeInput {
  class_type: string;
  _meta?: { title?: string };
  inputs: Record<string, PromptInputValue>;
}

/** POST /api/prompt — request body */
export interface PromptRequest {
  client_id: string;
  prompt: Record<string, PromptNodeInput>;
  extra_data?: { extra_pnginfo?: object };
}

/** POST /api/prompt — response */
export interface PromptResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
}

/** GET /api/prompt — response */
export interface QueueStatusResponse {
  exec_info: {
    queue_remaining: number;
  };
}

// --- Job (history) endpoints ---

export type JobStatusStr = "success" | "error" | "interrupted" | "cached";

export interface JobNodeOutput {
  [outputName: string]: unknown;
}

export interface JobNodeResult {
  outputs: Record<string, JobNodeOutput>;
  meta?: Record<string, unknown>;
}

export interface HistoryEntry {
  prompt: [number, string, Record<string, PromptNodeInput>, object, string[]];
  outputs: Record<string, JobNodeResult>;
  status: {
    status_str: JobStatusStr;
    completed: boolean;
    messages: [string, unknown][];
  };
}

/** GET /api/history and GET /api/history/{prompt_id} */
export type HistoryResponse = Record<string, HistoryEntry>;

/** DELETE /api/history — request body */
export interface DeleteHistoryRequest {
  delete?: string[];
  clear?: boolean;
}

// --- Node (object_info) endpoints ---

/** GET /api/object_info and GET /api/object_info/{node_type} */
export type ObjectInfoResponse = Record<string, NodeSchemaDef>;

// ---------------------------------------------------------------------------
// 6. Canvas Store State Shape
// ---------------------------------------------------------------------------

export interface CanvasExecutionState {
  /** Currently running job ID, null when idle */
  activeJobId: string | null;
  /** Per-node execution status updated from websocket / polling */
  nodeStatuses: Record<string, NodeExecutionStatus>;
  /** Error messages keyed by node ID */
  nodeErrors: Record<string, string>;
  /** History of completed job IDs (most recent first) */
  jobHistory: string[];
  /** Whether a submission is in-flight */
  isSubmitting: boolean;
}

export interface CanvasState {
  templateId: string;
  templateName: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  execution: CanvasExecutionState;
}

// ---------------------------------------------------------------------------
// 7. Node Library Item (used in the sidebar / context menu)
// ---------------------------------------------------------------------------

export interface NodeLibraryItem {
  schemaName: string;
  displayName: string;
  description: string;
  category: string;
  categoryTag: NodeCategory;
  /** Default position when dropped onto canvas — caller sets this */
  defaultPosition?: XYPosition;
}
