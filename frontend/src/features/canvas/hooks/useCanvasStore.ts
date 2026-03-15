// =============================================================================
// useCanvasStore
// Central state hook for the template canvas.
// Wraps ReactFlow node/edge state and adds execution lifecycle management.
// =============================================================================

"use client";

// Set to true to use fake/mock execution — backend not yet ready
const MOCK_MODE = true;

// Placeholder image shown in PreviewImageNode during mock runs
const MOCK_IMAGE_URL = "https://picsum.photos/seed/amplify/640/360";

import { useCallback, useReducer } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";

import type {
  CanvasNode,
  CanvasEdge,
  CanvasNodeData,
  NodeExecutionStatus,
  CanvasExecutionState,
  PromptRequest,
  PortDef,
} from "../types";
import { workflowApi, jobApi } from "../services/comfy-api";
import { buildPromptPayload } from "../lib/schemaMapper";

// ---------------------------------------------------------------------------
// Execution state reducer
// ---------------------------------------------------------------------------

type ExecAction =
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; jobId: string }
  | { type: "SUBMIT_ERROR" }
  | { type: "SET_NODE_STATUS"; nodeId: string; status: NodeExecutionStatus; error?: string }
  | { type: "JOB_COMPLETE"; jobId: string }
  | { type: "CLEAR_JOB" };

const initialExecState: CanvasExecutionState = {
  activeJobId: null,
  nodeStatuses: {},
  nodeErrors: {},
  jobHistory: [],
  isSubmitting: false,
};

function execReducer(
  state: CanvasExecutionState,
  action: ExecAction
): CanvasExecutionState {
  switch (action.type) {
    case "SUBMIT_START":
      return { ...state, isSubmitting: true };

    case "SUBMIT_SUCCESS":
      return {
        ...state,
        isSubmitting: false,
        activeJobId: action.jobId,
      };

    case "SUBMIT_ERROR":
      return { ...state, isSubmitting: false };

    case "SET_NODE_STATUS": {
      const nodeStatuses = { ...state.nodeStatuses, [action.nodeId]: action.status };
      const nodeErrors = { ...state.nodeErrors };
      if (action.error) {
        nodeErrors[action.nodeId] = action.error;
      } else {
        delete nodeErrors[action.nodeId];
      }
      return { ...state, nodeStatuses, nodeErrors };
    }

    case "JOB_COMPLETE":
      return {
        ...state,
        activeJobId: null,
        jobHistory: [action.jobId, ...state.jobHistory],
      };

    case "CLEAR_JOB":
      return { ...state, activeJobId: null, nodeStatuses: {}, nodeErrors: {} };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseCanvasStoreOptions {
  initialNodes?: CanvasNode[];
  initialEdges?: CanvasEdge[];
}

export function useCanvasStore({
  initialNodes = [],
  initialEdges = [],
}: UseCanvasStoreOptions = {}) {
  // ReactFlow manages node and edge geometry / selection
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(initialNodes);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<CanvasEdge>(initialEdges);

  // Execution lifecycle
  const [execution, dispatchExec] = useReducer(execReducer, initialExecState);

  // ---------------------------------------------------------------------------
  // Edge connection
  // ---------------------------------------------------------------------------

  const onConnect = useCallback(
    (connection: Connection) => {
      // Add the edge first
      setEdges((eds) =>
        addEdge(
          { ...connection, type: "status", data: { flowing: false, error: false } } as CanvasEdge,
          eds
        )
      );

      // COMFY_AUTOGROW_V3: when the last empty slot is filled, append a new one
      if (connection.target && connection.targetHandle) {
        setNodes((nds) => {
          const targetNode = nds.find((n) => n.id === connection.target);
          if (!targetNode) return nds;

          const connectedPort = targetNode.data.ports.find(
            (p) => p.id === connection.targetHandle
          );
          if (!connectedPort?.isAutogrowSlot) return nds;

          // Determine prefix (strip trailing _N)
          const prefix = connectedPort.id.replace(/_\d+$/, "");
          const agConfig = connectedPort.config as { template?: { max?: number } };
          const max = agConfig.template?.max ?? 10;

          const agPorts = targetNode.data.ports.filter(
            (p) => p.isAutogrowSlot && p.id.startsWith(prefix + "_")
          );
          const currentCount = agPorts.length;

          // Only expand when the user filled the last slot and haven't hit max
          if (connectedPort.autogrowIndex !== currentCount - 1) return nds;
          if (currentCount >= max) return nds;

          const newSlot: PortDef = {
            id: `${prefix}_${currentCount}`,
            label: `${prefix.replace(/_/g, " ")} ${currentCount + 1}`,
            portType: connectedPort.portType,
            direction: "input",
            required: "optional",
            config: connectedPort.config,
            tooltip: connectedPort.tooltip,
            isWidget: false,
            isAutogrowSlot: true,
            autogrowIndex: currentCount,
          };

          // Insert right after the last autogrow slot for this prefix
          const lastAgIdx = targetNode.data.ports.reduce(
            (best, p, i) =>
              p.isAutogrowSlot && p.id.startsWith(prefix + "_") ? i : best,
            -1
          );
          const insertAt = lastAgIdx + 1;

          const newPorts = [
            ...targetNode.data.ports.slice(0, insertAt),
            newSlot,
            ...targetNode.data.ports.slice(insertAt),
          ];

          return nds.map((n) =>
            n.id === connection.target
              ? { ...n, data: { ...n.data, ports: newPorts } }
              : n
          );
        });
      }
    },
    [setEdges, setNodes]
  );

  // Wrap onEdgesChange to prune trailing empty AUTOGROW slots on disconnect
  const onEdgesChange = useCallback(
    (changes: EdgeChange<CanvasEdge>[]) => {
      // Collect IDs of edges being removed
      const removedIds = new Set(
        changes
          .filter((c): c is { type: "remove"; id: string } => c.type === "remove")
          .map((c) => c.id)
      );

      if (removedIds.size > 0) {
        // Which edges are being removed, and what are they connected to?
        const removedEdges = edges.filter((e) => removedIds.has(e.id));
        const affectedTargets = new Set(
          removedEdges.filter((e) => e.targetHandle).map((e) => e.target)
        );

        if (affectedTargets.size > 0) {
          // Edges that will survive after this change
          const survivingEdges = edges.filter((e) => !removedIds.has(e.id));
          const connectedByNode: Record<string, Set<string>> = {};
          for (const e of survivingEdges) {
            if (!e.target || !e.targetHandle) continue;
            (connectedByNode[e.target] ??= new Set()).add(e.targetHandle);
          }

          setNodes((nds) =>
            nds.map((node) => {
              if (!affectedTargets.has(node.id)) return node;

              // Gather distinct autogrow prefixes for this node
              const prefixes = new Set<string>();
              for (const p of node.data.ports) {
                if (p.isAutogrowSlot) prefixes.add(p.id.replace(/_\d+$/, ""));
              }
              if (prefixes.size === 0) return node;

              const connected = connectedByNode[node.id] ?? new Set<string>();
              let ports = [...node.data.ports];
              let changed = false;

              for (const prefix of prefixes) {
                const agPorts = ports.filter(
                  (p) => p.isAutogrowSlot && p.id.startsWith(prefix + "_")
                );
                const cfg = agPorts[0]?.config as { template?: { min?: number } } | undefined;
                const min = cfg?.template?.min ?? 1;

                // Count trailing disconnected slots from the end
                let trailingEmpty = 0;
                for (let i = agPorts.length - 1; i >= 0; i--) {
                  if (!connected.has(agPorts[i].id)) trailingEmpty++;
                  else break;
                }

                // Target: max(min, connectedCount + 1) — always keep 1 free slot
                const connectedCount = agPorts.length - trailingEmpty;
                const targetCount = Math.max(min, connectedCount + 1);
                const toRemove = agPorts.length - targetCount;

                if (toRemove > 0) {
                  const removeIds = new Set(
                    agPorts.slice(agPorts.length - toRemove).map((p) => p.id)
                  );
                  ports = ports.filter((p) => !removeIds.has(p.id));

                  // Re-index remaining autogrow slots
                  let idx = 0;
                  ports = ports.map((p) => {
                    if (p.isAutogrowSlot && p.id.startsWith(prefix + "_")) {
                      const updated: PortDef = {
                        ...p,
                        id: `${prefix}_${idx}`,
                        autogrowIndex: idx,
                        label: `${prefix.replace(/_/g, " ")} ${idx + 1}`,
                      };
                      idx++;
                      return updated;
                    }
                    return p;
                  });
                  changed = true;
                }
              }

              return changed ? { ...node, data: { ...node.data, ports } } : node;
            })
          );
        }
      }

      onEdgesChangeBase(changes);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [edges, onEdgesChangeBase, setNodes]
  );

  // ---------------------------------------------------------------------------
  // Node data mutations
  // ---------------------------------------------------------------------------

  /** Update a single field in a node's config */
  const updateNodeConfig = useCallback(
    (nodeId: string, field: string, value: unknown) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config: { ...n.data.config, [field]: value } } }
            : n
        )
      );
    },
    [setNodes]
  );

  /** Replace a node's entire data object (use sparingly) */
  const updateNodeData = useCallback(
    (nodeId: string, patch: Partial<CanvasNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
        )
      );
    },
    [setNodes]
  );

  /** Delete all currently selected nodes and edges */
  const deleteSelectedElements = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  /** Remove a node and all its connected edges */
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
    },
    [setNodes, setEdges]
  );

  /** Add a new node to the canvas */
  const addNode = useCallback(
    (node: CanvasNode) => {
      setNodes((nds) => [...nds, node]);
    },
    [setNodes]
  );

  // ---------------------------------------------------------------------------
  // Per-node execution status (driven by WS events or polling)
  // ---------------------------------------------------------------------------

  const setNodeStatus = useCallback(
    (nodeId: string, status: NodeExecutionStatus, error?: string) => {
      dispatchExec({ type: "SET_NODE_STATUS", nodeId, status, error });
      // Mirror the status into the node's data so the visual node reacts
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status, errorMessage: error } }
            : n
        )
      );
      // Drive edge animation: processing → flowing, error → error indicator, else clear
      const isProcessing = status === "processing";
      const isError = status === "error";
      setEdges((eds) =>
        eds.map((e) =>
          e.source === nodeId
            ? { ...e, data: { flowing: isProcessing, error: isError } }
            : e
        )
      );
    },
    [setNodes, setEdges]
  );

  // ---------------------------------------------------------------------------
  // Workflow submission
  // ---------------------------------------------------------------------------

  /**
   * Submits the current canvas state.
   * In MOCK_MODE, runs a fake animated execution without hitting any backend.
   */
  const submitWorkflow = useCallback(
    async (clientId: string): Promise<string | null> => {
      dispatchExec({ type: "SUBMIT_START" });

      // Reset all nodes to queued, clear edge animations
      setNodes((nds) =>
        nds.map((n) => ({ ...n, data: { ...n.data, status: "queued" as NodeExecutionStatus } }))
      );
      setEdges((eds) =>
        eds.map((e) => ({ ...e, data: { flowing: false, error: false } }))
      );

      if (MOCK_MODE) {
        const jobId = `mock-${crypto.randomUUID().slice(0, 8)}`;
        dispatchExec({ type: "SUBMIT_SUCCESS", jobId });

        // Run nodes one-by-one to simulate execution
        // We take a snapshot of nodes at submission time (non-preview first)
        const snapshot = nodes.filter((n) => !n.data.output_node);
        for (const node of snapshot) {
          // Mark as processing + flowing edges
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? { ...n, data: { ...n.data, status: "processing" as NodeExecutionStatus } }
                : n
            )
          );
          setEdges((eds) =>
            eds.map((e) =>
              e.source === node.id
                ? { ...e, data: { flowing: true, error: false } }
                : e
            )
          );

          await delay(700 + Math.random() * 800);

          // Get a plausible mock output for this schema
          const mockOutput = getMockOutput(node.data.schemaName);
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? { ...n, data: { ...n.data, status: "success" as NodeExecutionStatus, outputValues: mockOutput } }
                : n
            )
          );
          setEdges((eds) =>
            eds.map((e) =>
              e.source === node.id
                ? { ...e, data: { flowing: false, error: false } }
                : e
            )
          );
        }

        // Propagate outputs into downstream nodes (preview nodes get their values)
        setNodes((nds) => {
          const nodeMap = Object.fromEntries(nds.map((n) => [n.id, n]));
          return nds.map((node) => {
            const incoming = edges.filter((e) => e.target === node.id);
            if (incoming.length === 0) return { ...node, data: { ...node.data, status: "success" as NodeExecutionStatus } };
            let newConfig = { ...node.data.config };
            let patched = false;
            for (const edge of incoming) {
              const src = nodeMap[edge.source];
              if (!src?.data.outputValues || !edge.targetHandle || !edge.sourceHandle) continue;
              const val = (src.data.outputValues as Record<string, unknown>)[edge.sourceHandle];
              if (val !== undefined) { newConfig[edge.targetHandle] = val; patched = true; }
            }
            // For preview image nodes that have no incoming value, inject placeholder
            if (node.data.schemaName === "PreviewImageNode" && !newConfig.image_uuid) {
              newConfig.image_uuid = MOCK_IMAGE_URL;
              patched = true;
            }
            return {
              ...node,
              data: {
                ...node.data,
                status: "success" as NodeExecutionStatus,
                ...(patched ? { config: newConfig } : {}),
              },
            };
          });
        });

        dispatchExec({ type: "JOB_COMPLETE", jobId });
        return jobId;
      }

      // ── Real ComfyUI path ────────────────────────────────────────────────
      try {
        const promptPayload = buildPromptPayload(nodes, edges);

        const request: PromptRequest = {
          client_id: clientId,
          prompt: promptPayload,
        };

        const response = await workflowApi.submitWorkflow(request);

        if (Object.keys(response.node_errors).length > 0) {
          for (const [nodeId, err] of Object.entries(response.node_errors)) {
            setNodeStatus(nodeId, "error", String(err));
          }
        }

        dispatchExec({ type: "SUBMIT_SUCCESS", jobId: response.prompt_id });
        return response.prompt_id;
      } catch (err) {
        console.error("[useCanvasStore] submitWorkflow failed:", err);
        dispatchExec({ type: "SUBMIT_ERROR" });

        setNodes((nds) =>
          nds.map((n) => ({ ...n, data: { ...n.data, status: "idle" as NodeExecutionStatus } }))
        );
        setEdges((eds) =>
          eds.map((e) => ({ ...e, data: { flowing: false, error: false } }))
        );

        return null;
      }
    },
    [nodes, edges, setNodes, setEdges, setNodeStatus]
  );

  // ---------------------------------------------------------------------------
  // Job result polling (fallback when no WebSocket is available)
  // ---------------------------------------------------------------------------

  /**
   * Polls GET /api/history/{jobId} until the job is complete,
   * then updates all node statuses from the result.
   *
   * @param jobId      The prompt_id returned by submitWorkflow
   * @param intervalMs Polling interval in milliseconds (default 2000)
   * @param timeoutMs  Give up after this many ms (default 120_000)
   */
  const pollJobResult = useCallback(
    async (jobId: string, intervalMs = 2000, timeoutMs = 120_000) => {
      const deadline = Date.now() + timeoutMs;

      const poll = async (): Promise<void> => {
        if (Date.now() > deadline) {
          console.warn("[useCanvasStore] pollJobResult timed out for", jobId);
          return;
        }

        try {
          const history = await jobApi.getJobResult(jobId);
          const entry = history[jobId];

          if (!entry) {
            // Job not yet in history — try again
            await delay(intervalMs);
            return poll();
          }

          if (!entry.status.completed) {
            await delay(intervalMs);
            return poll();
          }

          // Job completed — update node statuses + outputValues
          const jobStatus = entry.status.status_str;
          const globalStatus: NodeExecutionStatus =
            jobStatus === "success" || jobStatus === "cached" ? "success" : "error";

          setNodes((nds) => {
            // Step 1: stamp status + outputValues onto every node
            const withOutputs = nds.map((n) => ({
              ...n,
              data: {
                ...n.data,
                status: globalStatus,
                outputValues: (entry.outputs[n.id]?.outputs ?? {}) as Record<string, unknown>,
              },
            }));

            // Step 2: propagate upstream outputValues into downstream node configs
            // (so preview nodes and any wired widget inputs get the real values)
            return withOutputs.map((node) => {
              const patchedConfig = { ...node.data.config };
              let patched = false;

              for (const edge of edges) {
                if (
                  edge.target !== node.id ||
                  !edge.targetHandle ||
                  !edge.sourceHandle
                )
                  continue;
                const src = withOutputs.find((n) => n.id === edge.source);
                if (!src?.data.outputValues) continue;
                const val = src.data.outputValues[edge.sourceHandle];
                if (val !== undefined) {
                  patchedConfig[edge.targetHandle] = val;
                  patched = true;
                }
              }

              return patched
                ? { ...node, data: { ...node.data, config: patchedConfig } }
                : node;
            });
          });

          dispatchExec({ type: "JOB_COMPLETE", jobId });
        } catch (err) {
          console.error("[useCanvasStore] pollJobResult error:", err);
          await delay(intervalMs);
          return poll();
        }
      };

      return poll();
    },
    [setNodes, edges]
  );

  // ---------------------------------------------------------------------------
  // History management
  // ---------------------------------------------------------------------------

  /** Clear all job history from the ComfyUI server */
  const clearHistory = useCallback(async () => {
    await jobApi.deleteHistory({ clear: true });
    dispatchExec({ type: "CLEAR_JOB" });
  }, []);

  // ---------------------------------------------------------------------------
  // Expose state + actions
  // ---------------------------------------------------------------------------

  return {
    // ReactFlow state
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange: onNodesChange as (changes: NodeChange<CanvasNode>[]) => void,
    onEdgesChange: onEdgesChange as (changes: EdgeChange<CanvasEdge>[]) => void,
    onConnect,

    // Node mutations
    addNode,
    deleteNode,
    deleteSelectedElements,
    updateNodeConfig,
    updateNodeData,
    setNodeStatus,

    // Execution
    execution,
    submitWorkflow,
    pollJobResult,
    clearHistory,
  } as const;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Mock execution helpers
// ---------------------------------------------------------------------------

const MOCK_OUTPUT_MAP: Record<string, Record<string, unknown>> = {
  GeminiNodeAmplify: {
    text: "A futuristic city at sunset, neon lights reflecting off rain-soaked streets. A lone figure in a trench coat walks past glowing holographic advertisements. Atmosphere: cinematic, moody, perfect for a sci-fi short film.",
  },
  Veo3VideoGenerationNodeAmplify: {
    video_uuid: "mock-video-uuid-veo3",
  },
};

function getMockOutput(schemaName: string): Record<string, unknown> {
  return (
    MOCK_OUTPUT_MAP[schemaName] ?? {
      text: "Mock output from node execution.",
      image_uuid: MOCK_IMAGE_URL,
    }
  );
}
