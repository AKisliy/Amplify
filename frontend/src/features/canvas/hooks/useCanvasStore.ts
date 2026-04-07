// =============================================================================
// useCanvasStore
// Central state hook for the template canvas.
// Wraps ReactFlow node/edge state and adds execution lifecycle management.
// Status updates arrive via SignalR (OnNodeExecutionStatusChanged).
// =============================================================================

"use client";

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
  PortDef,
  ImageBatch,
} from "../types";
import { runTemplate } from "@/lib/api/template-service";

// ---------------------------------------------------------------------------
// Execution state reducer
// ---------------------------------------------------------------------------

type ExecAction =
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; jobId: string }
  | { type: "SUBMIT_ERROR" }
  | { type: "SET_NODE_STATUS"; nodeId: string; status: NodeExecutionStatus; error?: string }
  | { type: "CLEAR_JOB" };

const initialExecState: CanvasExecutionState = {
  activeJobId: null,
  nodeStatuses: {},
  nodeErrors: {},
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
      return { ...state, isSubmitting: false, activeJobId: action.jobId };

    case "SUBMIT_ERROR":
      return { ...state, isSubmitting: false };

    case "SET_NODE_STATUS": {
      const nodeStatuses = { ...state.nodeStatuses, [action.nodeId]: action.status };
      const nodeErrors = { ...state.nodeErrors };
      if (action.error) nodeErrors[action.nodeId] = action.error;
      else delete nodeErrors[action.nodeId];
      return { ...state, nodeStatuses, nodeErrors };
    }

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
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(initialNodes);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<CanvasEdge>(initialEdges);
  const [execution, dispatchExec] = useReducer(execReducer, initialExecState);

  // ---------------------------------------------------------------------------
  // Edge connection
  // ---------------------------------------------------------------------------

  const onConnect = useCallback(
    (connection: Connection) => {
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

          const prefix = connectedPort.id.replace(/_\d+$/, "");
          const agConfig = connectedPort.config as { template?: { max?: number } };
          const max = agConfig.template?.max ?? 10;

          const agPorts = targetNode.data.ports.filter(
            (p) => p.isAutogrowSlot && p.id.startsWith(prefix + "_")
          );
          const currentCount = agPorts.length;

          if (connectedPort.autogrowIndex !== currentCount - 1) return nds;
          if (currentCount >= max) return nds;

          const newSlot: PortDef = {
            id: `${prefix}${currentCount}`,
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

          const lastAgIdx = targetNode.data.ports.reduce(
            (best, p, i) =>
              p.isAutogrowSlot && p.id.startsWith(prefix + "_") ? i : best,
            -1
          );

          const newPorts = [
            ...targetNode.data.ports.slice(0, lastAgIdx + 1),
            newSlot,
            ...targetNode.data.ports.slice(lastAgIdx + 1),
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
      const removedIds = new Set(
        changes
          .filter((c): c is { type: "remove"; id: string } => c.type === "remove")
          .map((c) => c.id)
      );

      if (removedIds.size > 0) {
        const removedEdges = edges.filter((e) => removedIds.has(e.id));
        const affectedTargets = new Set(
          removedEdges.filter((e) => e.targetHandle).map((e) => e.target)
        );

        if (affectedTargets.size > 0) {
          const survivingEdges = edges.filter((e) => !removedIds.has(e.id));
          const connectedByNode: Record<string, Set<string>> = {};
          for (const e of survivingEdges) {
            if (!e.target || !e.targetHandle) continue;
            (connectedByNode[e.target] ??= new Set()).add(e.targetHandle);
          }

          setNodes((nds) =>
            nds.map((node) => {
              if (!affectedTargets.has(node.id)) return node;

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

                let trailingEmpty = 0;
                for (let i = agPorts.length - 1; i >= 0; i--) {
                  if (!connected.has(agPorts[i].id)) trailingEmpty++;
                  else break;
                }

                const connectedCount = agPorts.length - trailingEmpty;
                const targetCount = Math.max(min, connectedCount + 1);
                const toRemove = agPorts.length - targetCount;

                if (toRemove > 0) {
                  const removeIds = new Set(
                    agPorts.slice(agPorts.length - toRemove).map((p) => p.id)
                  );
                  ports = ports.filter((p) => !removeIds.has(p.id));

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

  /**
   * Appends image UUIDs from a successful node execution as a new ImageBatch
   * in node.data.outputHistory. Call this instead of (or in addition to)
   * updateNodeData when outputs contain image_uuid arrays.
   */
  const appendNodeOutputHistory = useCallback(
    (nodeId: string, outputs: Record<string, unknown>) => {
      const imageUuids = (outputs.image_uuid as string[] | undefined) ?? [];
      if (imageUuids.length === 0) return;

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const existingHistory = (n.data.outputHistory as ImageBatch[]) ?? [];
          const nextRunIndex =
            existingHistory.length > 0
              ? existingHistory[existingHistory.length - 1].runIndex + 1
              : 0;
          const newBatch: ImageBatch = { runIndex: nextRunIndex, imageUuids };
          return {
            ...n,
            data: {
              ...n.data,
              outputHistory: [...existingHistory, newBatch],
            },
          };
        })
      );
    },
    [setNodes]
  );

  /**
   * After a node completes successfully, walk all outgoing edges from that
   * node and push output values into each downstream node's config.
   *
   * Rule: outputs[sourceHandle] is typically an array — we take the first
   * element and write it as a string into targetNode.data.config[targetHandle].
   */
  const propagateOutputsDownstream = useCallback(
    (nodeId: string, outputs: Record<string, unknown>) => {
      setNodes((nds) => {
        const outgoingEdges = edges.filter(
          (e) => e.source === nodeId && e.sourceHandle && e.targetHandle
        );
        if (outgoingEdges.length === 0) return nds;

        return nds.map((n) => {
          const relevantEdges = outgoingEdges.filter((e) => e.target === n.id);
          if (relevantEdges.length === 0) return n;

          const configPatch: Record<string, unknown> = {};
          // Collect image UUIDs being propagated into this node
          const incomingImageUuids: string[] = [];

          for (const edge of relevantEdges) {
            const outputKey = edge.sourceHandle!;
            const targetKey = edge.targetHandle!;
            const raw = outputs[outputKey];
            if (raw === undefined) continue;
            // Outputs are arrays from the backend — take the first element
            const value = Array.isArray(raw) ? raw[0] : raw;
            if (value !== undefined) {
              configPatch[targetKey] = String(value);
              // Track image UUIDs so we can also update outputHistory
              if (outputKey === "image_uuid") {
                const uuids = Array.isArray(raw)
                  ? (raw as string[])
                  : [String(raw)];
                incomingImageUuids.push(...uuids);
              }
            }
          }

          if (Object.keys(configPatch).length === 0) return n;

          // Build outputHistory patch if image UUIDs are flowing in
          let nextHistory = (n.data.outputHistory as ImageBatch[] | undefined) ?? [];
          if (incomingImageUuids.length > 0) {
            const nextRunIndex =
              nextHistory.length > 0
                ? nextHistory[nextHistory.length - 1].runIndex + 1
                : 0;
            nextHistory = [
              ...nextHistory,
              { runIndex: nextRunIndex, imageUuids: incomingImageUuids },
            ];
          }

          return {
            ...n,
            data: {
              ...n.data,
              config: { ...n.data.config, ...configPatch },
              outputHistory: nextHistory,
            },
          };
        });
      });
    },
    [setNodes, edges]
  );

  const deleteSelectedElements = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
    },
    [setNodes, setEdges]
  );

  const addNode = useCallback(
    (node: CanvasNode) => {
      setNodes((nds) => [...nds, node]);
    },
    [setNodes]
  );

  // ---------------------------------------------------------------------------
  // Per-node execution status — driven by SignalR events from the page
  // ---------------------------------------------------------------------------

  const setNodeStatus = useCallback(
    (nodeId: string, status: NodeExecutionStatus, error?: string) => {
      dispatchExec({ type: "SET_NODE_STATUS", nodeId, status, error });
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status, errorMessage: error } }
            : n
        )
      );
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
   * Calls POST /v1/engine/run to submit the template for execution.
   * Node status updates arrive via SignalR → setNodeStatus.
   */
  const submitWorkflow = useCallback(
    async (templateId: string): Promise<string | null> => {
      dispatchExec({ type: "SUBMIT_START" });

      setNodes((nds) =>
        nds.map((n) => ({ ...n, data: { ...n.data, status: "queued" as NodeExecutionStatus } }))
      );
      setEdges((eds) =>
        eds.map((e) => ({ ...e, data: { flowing: false, error: false } }))
      );

      try {
        const response = await runTemplate(templateId);
        dispatchExec({ type: "SUBMIT_SUCCESS", jobId: response.job_id });
        return response.job_id;
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
    [setNodes, setEdges]
  );

  // ---------------------------------------------------------------------------
  // Expose state + actions
  // ---------------------------------------------------------------------------

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange: onNodesChange as (changes: NodeChange<CanvasNode>[]) => void,
    onEdgesChange: onEdgesChange as (changes: EdgeChange<CanvasEdge>[]) => void,
    onConnect,

    addNode,
    deleteNode,
    deleteSelectedElements,
    updateNodeConfig,
    updateNodeData,
    appendNodeOutputHistory,
    propagateOutputsDownstream,
    setNodeStatus,

    execution,
    submitWorkflow,
  } as const;
}
