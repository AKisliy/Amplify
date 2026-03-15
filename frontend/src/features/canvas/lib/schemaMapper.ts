// =============================================================================
// Schema Mapper
// Converts NodeSchemaDef objects into ReactFlow CanvasNodes and builds the
// ComfyUI prompt payload from canvas state.
// =============================================================================

import type { XYPosition, Edge } from "@xyflow/react";

import type {
  NodeSchemaDef,
  NodeInputDef,
  NodeInputPrimitive,
  NodeInputConfig,
  StringInputConfig,
  PortDef,
  CanvasNode,
  CanvasNodeData,
  CanvasNodeType,
  NodeCategory,
  PromptNodeInput,
  PromptInputValue,
} from "../types";
import { resolveCategoryTag } from "../registry";

// ---------------------------------------------------------------------------
// 1. Port resolution — schema inputs/outputs → PortDef[]
// ---------------------------------------------------------------------------

/**
 * Decides whether an input should be rendered as an inline widget
 * or as a connectable handle.
 *
 * ComfyUI rule:
 *   - forceInput: true   → always a handle
 *   - STRING multiline   → inline textarea (but still connectable if wired)
 *   - COMBO              → inline select
 *   - INT / FLOAT        → inline number / slider
 *   - BOOLEAN            → inline toggle
 *   - COMFY_AUTOGROW_V3  → dynamic handles, never a widget
 */
function isWidgetInput(type: NodeInputPrimitive, config: NodeInputConfig): boolean {
  const cfg = config as Record<string, unknown>;
  if (cfg.forceInput === true) return false;
  if (type === "COMFY_AUTOGROW_V3") return false;
  return true; // STRING, INT, FLOAT, BOOLEAN, COMBO default to widget
}

/**
 * Parses all input fields from a schema definition into PortDef objects.
 * COMFY_AUTOGROW_V3 inputs are expanded into a fixed set of slots (min slots).
 */
function parseInputPorts(schema: NodeSchemaDef): PortDef[] {
  const ports: PortDef[] = [];

  const processInputGroup = (
    inputs: Record<string, NodeInputDef>,
    required: "required" | "optional"
  ) => {
    for (const [fieldName, inputDef] of Object.entries(inputs)) {
      const [type, config] = inputDef;

      if (type === "COMFY_AUTOGROW_V3") {
        // Expand the autogrow group into `min` initial slots
        const agConfig = config as { template: { prefix: string; min: number; max: number } };
        const min = agConfig.template?.min ?? 1;
        const prefix = agConfig.template?.prefix ?? fieldName;

        for (let i = 0; i < min; i++) {
          ports.push({
            id: `${prefix}_${i}`,
            label: `${prefix.replace(/_/g, " ")} ${i + 1}`,
            portType: "STRING",
            direction: "input",
            required,
            config,
            tooltip: (config as Record<string, string | undefined>).tooltip,
            isWidget: false,
            isAutogrowSlot: true,
            autogrowIndex: i,
          });
        }
        continue;
      }

      const cfg = config as NodeInputConfig;
      ports.push({
        id: fieldName,
        label: fieldName.replace(/_/g, " "),
        portType: type,
        direction: "input",
        required,
        config: cfg,
        tooltip: (cfg as Record<string, string | undefined>).tooltip,
        isWidget: isWidgetInput(type, cfg),
      });
    }
  };

  processInputGroup(schema.input.required, "required");
  if (schema.input.optional) {
    processInputGroup(schema.input.optional, "optional");
  }

  return ports;
}

/**
 * Parses the output array from a schema definition into output PortDef objects.
 */
function parseOutputPorts(schema: NodeSchemaDef): PortDef[] {
  return schema.output.map((type, index) => ({
    id: schema.output_name[index] ?? `output_${index}`,
    label: (schema.output_name[index] ?? `output_${index}`).replace(/_/g, " "),
    portType: type,
    direction: "output" as const,
    required: "required" as const,
    config: {} as NodeInputConfig,
    tooltip: schema.output_tooltips[index] ?? undefined,
    isWidget: false,
  }));
}

/**
 * Full port list for a node: all inputs then all outputs.
 */
export function parsePorts(schema: NodeSchemaDef): PortDef[] {
  return [...parseInputPorts(schema), ...parseOutputPorts(schema)];
}

// ---------------------------------------------------------------------------
// 2. Default config values — pre-populate the node's config from schema defaults
// ---------------------------------------------------------------------------

export function buildDefaultConfig(schema: NodeSchemaDef): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  const processGroup = (inputs: Record<string, NodeInputDef>) => {
    for (const [fieldName, [type, cfg]] of Object.entries(inputs)) {
      if (type === "COMFY_AUTOGROW_V3") continue;
      const c = cfg as Record<string, unknown>;
      if ("default" in c && c.default !== undefined) {
        config[fieldName] = c.default;
      } else if (type === "STRING") {
        config[fieldName] = "";
      } else if (type === "BOOLEAN") {
        config[fieldName] = false;
      } else if (type === "INT" || type === "FLOAT") {
        config[fieldName] = 0;
      } else if (type === "COMBO") {
        const comboConfig = c as { options?: string[] };
        config[fieldName] = comboConfig.options?.[0] ?? "";
      }
    }
  };

  processGroup(schema.input.required);
  if (schema.input.optional) {
    processGroup(schema.input.optional);
  }

  return config;
}

// ---------------------------------------------------------------------------
// 3. Schema → ReactFlow CanvasNode
// ---------------------------------------------------------------------------

/**
 * Converts a NodeSchemaDef into a fully typed ReactFlow CanvasNode,
 * ready to be dropped onto the canvas.
 *
 * @param schemaName  Registry key (e.g. "GeminiNodeAmplify")
 * @param schema      The full schema definition
 * @param position    Where to place the node on the canvas
 * @param id          Optional stable ID (auto-generated if omitted)
 */
export function nodeDefToCanvasNode(
  schemaName: string,
  schema: NodeSchemaDef,
  position: XYPosition,
  id?: string,
  nodeType: CanvasNodeType = "amplify-node"
): CanvasNode {
  const nodeId = id ?? crypto.randomUUID();
  const categoryTag: NodeCategory = resolveCategoryTag(schema.category);

  const data: CanvasNodeData = {
    schemaName,
    displayName: schema.display_name,
    category: schema.category,
    categoryTag,
    status: "idle",
    config: buildDefaultConfig(schema),
    ports: parsePorts(schema),
  };

  return {
    id: nodeId,
    type: nodeType,
    position,
    data,
  };
}

// ---------------------------------------------------------------------------
// 4. Canvas state → ComfyUI prompt payload
// ---------------------------------------------------------------------------

/**
 * Builds the `prompt` record for POST /api/prompt from the current canvas
 * nodes and edges.
 *
 * Edge wiring logic:
 *   For each target node input that has an incoming edge, replace the
 *   widget/config value with a node-link reference: [sourceNodeId, outputIndex].
 *   The output index is derived from the source node's output_name array.
 */
export function buildPromptPayload(
  nodes: CanvasNode[],
  edges: Edge[]
): Record<string, PromptNodeInput> {
  // Build a lookup: nodeId → schema output_name list
  // We read this from the ports (direction === "output")
  const nodeOutputNames: Record<string, string[]> = {};
  for (const node of nodes) {
    nodeOutputNames[node.id] = node.data.ports
      .filter((p) => p.direction === "output")
      .map((p) => p.id);
  }

  // Build edge lookup: "[targetId]:[targetHandle]" → [sourceId, outputIndex]
  const edgeLinkMap: Record<string, [string, number]> = {};
  for (const edge of edges) {
    if (!edge.source || !edge.target || !edge.sourceHandle || !edge.targetHandle) {
      continue;
    }
    const outputNames = nodeOutputNames[edge.source] ?? [];
    const outputIndex = outputNames.indexOf(edge.sourceHandle);
    if (outputIndex === -1) continue;
    edgeLinkMap[`${edge.target}:${edge.targetHandle}`] = [
      edge.source,
      outputIndex,
    ];
  }

  // Build the prompt record
  const prompt: Record<string, PromptNodeInput> = {};

  for (const node of nodes) {
    const inputs: Record<string, PromptInputValue> = {};

    // For each input port, check if it's wired via an edge, otherwise use config value
    for (const port of node.data.ports) {
      if (port.direction !== "input") continue;

      const linkKey = `${node.id}:${port.id}`;
      const link = edgeLinkMap[linkKey];

      if (link) {
        inputs[port.id] = link;
      } else if (!port.isWidget) {
        // Handle ports that are not wired and not widgets are left undefined
        // (ComfyUI will error if a required handle has no connection)
        continue;
      } else {
        // Widget value from config
        const value = node.data.config[port.id];
        if (value !== undefined && value !== "") {
          inputs[port.id] = value as PromptInputValue;
        }
      }
    }

    prompt[node.id] = {
      class_type: node.data.schemaName,
      _meta: { title: node.data.displayName },
      inputs,
    };
  }

  return prompt;
}
