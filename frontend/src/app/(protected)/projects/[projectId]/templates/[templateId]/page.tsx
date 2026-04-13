"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, PanelLeft, Image as ImageIcon, Sparkles, Eye, Copy, Loader2 } from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type Connection,
  type IsValidConnection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { ProjectHeader } from "@/components/ProjectHeader";
import { useTheme } from "next-themes";
import {
  updateTemplateV1TemplatesTemplateIdPatch,
  createTemplateV1TemplatesPost,
  getTemplateV1TemplatesTemplateIdGet,
} from "@/lib/api/template-service";
import { useHubConnection } from "@/hooks/useHubConnection";
import { getReceiverRegister } from "@/lib/api/TypedSignalR.Client";
import type { IClientReceiver } from "@/lib/api/TypedSignalR.Client/WebSocketGateway.Web.Receivers";
import type { NodeExecutionStatus } from "@/features/canvas/types";

// Canvas feature imports
import { AmplifyNode } from "@/features/canvas/components/AmplifyNode";
import { PreviewNode } from "@/features/canvas/components/PreviewNode";
import { ImportMediaNode } from "@/features/canvas/components/ImportMediaNode";
import { FlowingEdge } from "@/features/canvas/components/FlowingEdge";
import { ContextMenu } from "@/features/canvas/components/ContextMenu";
import { NodeContextMenu } from "@/features/canvas/components/NodeContextMenu";
import { NodeLibrarySidebar } from "@/features/canvas/components/NodeLibrarySidebar";
import { MediaAssetsPanel } from "@/features/canvas/components/MediaAssetsPanel";
import { TemplateMenu } from "@/features/canvas/components/TemplateMenu";
import { GeneratedMediaPanel } from "@/features/canvas/components/GeneratedMediaPanel";
import { useCanvasStore } from "@/features/canvas/hooks/useCanvasStore";
import { useNodeRegistry } from "@/features/canvas/hooks/useNodeRegistry";
import { getNodesByCategory, getNodeDef } from "@/features/canvas/registry";
import { nodeDefToCanvasNode } from "@/features/canvas/lib/schemaMapper";
import { PREVIEW_SCHEMA_NAMES } from "@/features/canvas/registry/preview-schemas";
import type { CanvasNode, CanvasEdge } from "@/features/canvas/types";
// (getTemplateV1TemplatesTemplateIdGet imported above)

// ---------------------------------------------------------------------------
// Node / Edge type registrations
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
  "amplify-node": AmplifyNode as unknown as NodeTypes[string],
  "preview-node":  PreviewNode as unknown as NodeTypes[string],
  "import-media-node": ImportMediaNode as unknown as NodeTypes[string],
};

const edgeTypes: EdgeTypes = {
  status: FlowingEdge,
};

const SEED_EDGES: CanvasEdge[] = [];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type SidebarTab = "nodes" | "media" | "generated";

// ---------------------------------------------------------------------------
// Read-only banner
// ---------------------------------------------------------------------------

function ReadOnlyBanner({
  templateName,
  onDuplicate,
  isDuplicating,
}: {
  templateName: string;
  onDuplicate: () => void;
  isDuplicating: boolean;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl"
        style={{
          background: "rgba(15,15,20,0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
      >
        {/* Eye icon */}
        <div className="flex items-center gap-1.5 text-white/40 text-xs shrink-0">
          <Eye className="w-3.5 h-3.5" />
          <span>You&apos;re viewing a <em className="not-italic font-semibold text-white/60">read-only</em> version of this workflow</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-white/10 shrink-0" />

        {/* CTA */}
        <motion.button
          id="btn-duplicate-to-project"
          onClick={onDuplicate}
          disabled={isDuplicating}
          whileHover={isDuplicating ? {} : { scale: 1.04 }}
          whileTap={isDuplicating ? {} : { scale: 0.96 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            color: "#fff",
            opacity: isDuplicating ? 0.7 : 1,
            boxShadow: "0 2px 12px rgba(124,58,237,0.5)",
          }}
        >
          {isDuplicating ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Duplicating…</>
          ) : (
            <><Copy className="w-3 h-3" /> Duplicate to My Templates</>
          )}
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TemplateCanvasPage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const projectId    = params?.projectId  as string;
  const templateId   = params?.templateId as string;

  /** true when opened from the workflow library in read-only preview mode */
  const isReadonly = searchParams?.get("readonly") === "1";
  /** the original global template id to copy from (may equal templateId) */
  const srcTemplateId = searchParams?.get("src") ?? templateId;

  const [isDuplicating, setIsDuplicating] = useState(false);

  const { resolvedTheme } = useTheme();
  const { projects, isLoading: projectsLoading } = useProjects();
  const { registry, isLoading: registryLoading } = useNodeRegistry();
  const nodeLibrary = useMemo(() => getNodesByCategory(registry), [registry]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab,  setSidebarTab]  = useState<SidebarTab>("nodes");

  const [contextMenu, setContextMenu] = useState<{
    screenPos: { x: number; y: number };
    flowPos:   { x: number; y: number };
  } | null>(null);

  const [nodeContextMenu, setNodeContextMenu] = useState<{
    nodeId: string;
    pos: { x: number; y: number };
  } | null>(null);

  const [templateName,    setTemplateName]    = useState("");
  const [templateMenuPos, setTemplateMenuPos] = useState<{ x: number; y: number } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfInstanceRef = useRef<any>(null);

  // Fetch template name
  useEffect(() => {
    if (!templateId) return;
    (async () => {
      try {
        const response = await getTemplateV1TemplatesTemplateIdGet({ path: { template_id: templateId } });
        if (response?.data?.name) setTemplateName(response.data.name);
      } catch (err) {
        console.error("Failed to fetch template name:", err);
      }
    })();
  }, [templateId]);

  // ── Canvas store ─────────────────────────────────────────────────────────────
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, deleteNode, deleteSelectedElements,
    updateNodeConfig, updateNodeData,
    appendNodeOutputHistory,
    propagateOutputsDownstream,
    setNodes, setEdges,
    execution, submitWorkflow,
    setNodeStatus,
  } = useCanvasStore({});

  const { connection } = useHubConnection();
  const { toast } = useToast();

  // ── Duplicate read-only template → new editable copy ─────────────────────────
  const handleDuplicate = useCallback(async () => {
    if (!projectId || isDuplicating) return;
    setIsDuplicating(true);
    try {
      // Fetch the source graph
      const srcResp = await getTemplateV1TemplatesTemplateIdGet({
        path: { template_id: srcTemplateId },
      });
      const srcData = srcResp?.data;
      const { data: newTpl } = await createTemplateV1TemplatesPost({
        body: {
          project_id: projectId,
          name: srcData?.name ? `Copy of ${srcData.name}` : "Duplicated Workflow",
          description: srcData?.description ?? undefined,
          current_graph_json: srcData?.current_graph_json ?? {},
        },
        throwOnError: true,
      });
      toast({ title: "Duplicated!", description: `"${newTpl!.name}" added to your templates.`, duration: 5000 });
      router.push(`/projects/${projectId}/templates/${newTpl!.id}`);
    } catch (err) {
      console.error("Duplicate failed:", err);
      toast({ variant: "destructive", title: "Duplicate failed", description: "Please try again.", duration: 4000 });
    } finally {
      setIsDuplicating(false);
    }
  }, [projectId, srcTemplateId, isDuplicating, router, toast]);

  // ── SignalR: subscribe to node execution events ──────────────────────────────
  useEffect(() => {
    if (!connection) return;

    const receiver: IClientReceiver = {
      onNodeExecutionStatusChanged: async (nodeId, status, outputs, error) => {
        const mapped: NodeExecutionStatus =
          status === "RUNNING" ? "processing"
          : status === "SUCCESS" || status === "CACHED" ? "success"
          : status === "FAILURE" ? "error"
          : "idle";

        setNodeStatus(nodeId, mapped, error ?? undefined);

        if (outputs && mapped === "success") {
          updateNodeData(nodeId, { outputValues: outputs as Record<string, unknown> });
          // Accumulate image history — does nothing if outputs has no image_uuid
          appendNodeOutputHistory(nodeId, outputs as Record<string, unknown>);
          // Push output values into all downstream connected nodes' config
          // (this is what makes PreviewImageNode / PreviewTextNode display results)
          propagateOutputsDownstream(nodeId, outputs as Record<string, unknown>);
        }
      },
      onPublicationStatusChanged: async () => {},
      onVideoEditingStepChanged: async () => {},
      onJobCompleted: async (jobId) => {
        toast({
          title: "Graph completed",
          description: "Saving your asset…",
          duration: 8000,
        });
      },
      onAssetReady: async (id, jobId, assetProjectId, mediaId, mediaType) => {
        toast({
          title: "Asset ready",
          description: `Your ${mediaType} is saved. Open project assets →`,
          duration: 10000,
        });
      },
    };

    const disposable = getReceiverRegister("IClientReceiver").register(connection, receiver);
    return () => disposable.dispose();
  }, [connection, setNodeStatus, updateNodeData, appendNodeOutputHistory, propagateOutputsDownstream, toast]);

  // ── Load saved graph (waits for registry) ───────────────────────────────────
  const [isGraphReady, setIsGraphReady] = useState(false);

  useEffect(() => {
    if (!templateId || registryLoading) return;
    (async () => {
      try {
        // 1. Try localStorage first
        const localStorageKey = `template-canvas-${templateId}`;
        const localStorageData = localStorage.getItem(localStorageKey);
        if (localStorageData) {
          try {
            const parsedLocal = JSON.parse(localStorageData);
            if (parsedLocal.nodes && Array.isArray(parsedLocal.nodes) && parsedLocal.nodes.length > 0) {
              setNodes(parsedLocal.nodes as CanvasNode[]);
              if (parsedLocal.edges) setEdges(parsedLocal.edges as CanvasEdge[]);
              return;
            }
          } catch (e) {
            console.warn("Failed to parse localStorage data:", e);
          }
        }

        // 2. Fall back to backend
        const response = await getTemplateV1TemplatesTemplateIdGet({ path: { template_id: templateId } });
        const savedGraph = response?.data?.current_graph_json;

        if (savedGraph) {
          let parsedGraph = savedGraph;
          if (typeof savedGraph === "string") {
            try { parsedGraph = JSON.parse(savedGraph); } catch { /* ignore */ }
          }
          if (typeof parsedGraph === "object" && "nodes" in parsedGraph && "edges" in parsedGraph) {
            const pNodes = (parsedGraph.nodes as unknown[]) || [];
            const pEdges = (parsedGraph.edges as unknown[]) || [];
            if (Array.isArray(pNodes) && pNodes.length > 0) {
              setNodes(pNodes as CanvasNode[]);
              if (Array.isArray(pEdges)) setEdges(pEdges as CanvasEdge[]);
              return;
            }
          }
        }

        // 3. No saved graph — build seed from registry
        const geminiDef = registry["GeminiImageNode"];
        const veo3Def   = registry["Veo3VideoGenerationNode"];
        if (geminiDef && veo3Def) {
          const geminiId   = crypto.randomUUID();
          const veo3Id     = crypto.randomUUID();
          const geminiNode = nodeDefToCanvasNode("GeminiImageNode", geminiDef, { x: 80, y: 120 }, geminiId);
          const veo3Node   = nodeDefToCanvasNode("Veo3VideoGenerationNode", veo3Def, { x: 520, y: 80 }, veo3Id);
          const seedEdge: CanvasEdge = {
            id: crypto.randomUUID(),
            source: geminiId,
            sourceHandle: "image_uuid",
            target: veo3Id,
            targetHandle: "image_uuid",
            type: "status",
            data: { flowing: false, error: false },
          };
          setNodes([geminiNode, veo3Node]);
          setEdges([seedEdge]);
        }
      } catch (err) {
        console.error("Failed to load saved template graph:", err);
      } finally {
        setIsGraphReady(true);
      }
    })();
  }, [templateId, registryLoading, registry, setNodes, setEdges]);

  // ── Debounced auto-save (2s after last change) ───────────────────────────────
  useEffect(() => {
    if (!isGraphReady || !templateId || nodes.length === 0) return;
    const timer = setTimeout(async () => {
      const payload = { nodes: nodes as unknown[], edges: edges as unknown[] };
      localStorage.setItem(`template-canvas-${templateId}`, JSON.stringify(payload));
      try {
        await updateTemplateV1TemplatesTemplateIdPatch({
          path: { template_id: templateId },
          body: { current_graph_json: payload },
        });
      } catch {
        // Silently fail — localStorage already has the backup
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [nodes, edges, templateId, isGraphReady]);

  // ── Escape key — close menus or delete selected ──────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (contextMenu)     { setContextMenu(null);     return; }
      if (nodeContextMenu) { setNodeContextMenu(null); return; }
      if (templateMenuPos) { setTemplateMenuPos(null); return; }
      deleteSelectedElements();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [contextMenu, nodeContextMenu, templateMenuPos, deleteSelectedElements]);

  // ── Per-node callbacks ──────────────────────────────────────────────────────
  const handleUpdateConfig = useCallback(
    (nodeId: string) => (field: string, value: unknown) => updateNodeConfig(nodeId, field, value),
    [updateNodeConfig]
  );
  const handleDeleteNodeCb = useCallback(
    (nodeId: string) => () => deleteNode(nodeId),
    [deleteNode]
  );

  const nodesWithCallbacks: CanvasNode[] = useMemo(
    () => nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onUpdateConfig: handleUpdateConfig(node.id),
        onDeleteNode:   handleDeleteNodeCb(node.id),
      },
    })) as CanvasNode[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes]
  );

  // ── Add node helper ──────────────────────────────────────────────────────────
  const handleAddNode = useCallback(
    (schemaName: string, position: { x: number; y: number }, initialConfig?: Record<string, unknown>) => {
      const def = getNodeDef(registry, schemaName);
      if (!def) return;
      let nodeType: "amplify-node" | "preview-node" | "import-media-node" = "amplify-node";
      if (schemaName === "ImportMediaNode" || schemaName === "MediaInputNode") nodeType = "import-media-node";
      else if (PREVIEW_SCHEMA_NAMES.has(schemaName)) nodeType = "preview-node";
      const newNode  = nodeDefToCanvasNode(schemaName, def, position, crypto.randomUUID(), nodeType);
      if (initialConfig) newNode.data.config = { ...newNode.data.config, ...initialConfig };
      addNode(newNode);
    },
    [addNode, registry]
  );

  // ── Pane context menu ────────────────────────────────────────────────────────
  const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    setNodeContextMenu(null);
    const flowPos = rfInstanceRef.current?.screenToFlowPosition({ x: event.clientX, y: event.clientY }) ?? { x: 0, y: 0 };
    setContextMenu({ screenPos: { x: event.clientX, y: event.clientY }, flowPos });
  }, []);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: CanvasNode) => {
    event.preventDefault();
    setContextMenu(null);
    setNodeContextMenu({ nodeId: node.id, pos: { x: event.clientX, y: event.clientY } });
  }, []);

  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
    setNodeContextMenu(null);
    setTemplateMenuPos(null);
  }, []);

  // ── Drag-and-drop ────────────────────────────────────────────────────────────
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!rfInstanceRef.current) return;
    const position = rfInstanceRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });

    // Node from library sidebar
    const schemaName = event.dataTransfer.getData("application/amplify-node");
    if (schemaName) { handleAddNode(schemaName, position); return; }

    // Media asset from MediaAssetsPanel
    const mediaRaw = event.dataTransfer.getData("application/amplify-media");
    if (mediaRaw) {
      try {
        const payload = JSON.parse(mediaRaw) as { url: string; mediaType: "image" | "video"; id: string };
        const mediaUuid = payload.id || new URL(payload.url).pathname.split("/").pop() || "";
        handleAddNode("MediaInputNode", position, {
          media_uuid: mediaUuid,
          media_type: payload.mediaType,
          media_preview_url: payload.url,
        });
      } catch { /* invalid payload */ }
    }
  }, [handleAddNode]);

  // ── Run ──────────────────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    await submitWorkflow(templateId);
  }, [submitWorkflow, templateId]);

  // ── Port-type compatibility ────────────────────────────────────────────────
  // Defines which source port types can connect to which target port types.
  // COMFY_AUTOGROW_V3 is a wildcard slot that accepts any type.
  const CONNECTION_COMPAT: Record<string, string[]> = {
    STRING:            ["STRING", "COMFY_AUTOGROW_V3"],
    INT:               ["INT",    "COMFY_AUTOGROW_V3"],
    FLOAT:             ["FLOAT",  "INT", "COMFY_AUTOGROW_V3"],
    BOOLEAN:           ["BOOLEAN","COMFY_AUTOGROW_V3"],
    COMBO:             ["COMBO",  "STRING", "COMFY_AUTOGROW_V3"],
    IMAGE:             ["IMAGE",  "COMFY_AUTOGROW_V3"],
    VIDEO:             ["VIDEO",  "COMFY_AUTOGROW_V3"],
    COMFY_AUTOGROW_V3: ["STRING","INT","FLOAT","BOOLEAN","COMBO","IMAGE","VIDEO","COMFY_AUTOGROW_V3"],
  };

  /** Look up a port's type string given its node-id and handle-id */
  const getPortType = useCallback(
    (nodeId: string | null, handleId: string | null): string | null => {
      if (!nodeId || !handleId) return null;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;
      const port = node.data.ports.find((p) => p.id === handleId);
      return port?.portType ?? null;
    },
    [nodes]
  );

  const isValidConnection: IsValidConnection<CanvasEdge> = useCallback(
    (connection) => {
      const srcType = getPortType(connection.source, connection.sourceHandle ?? null);
      const tgtType = getPortType(connection.target, connection.targetHandle ?? null);
      // Unknown port type → allow (safe fallback for custom node types)
      if (!srcType || !tgtType) return true;
      const allowed = CONNECTION_COMPAT[srcType] ?? [];
      return allowed.includes(tgtType);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getPortType]
  );

  // Track the source type during drag so onConnectEnd can report the mismatch
  const dragSourceRef = useRef<{ srcType: string | null }>({ srcType: null });

  const handleConnectStart = useCallback(
    (_: unknown, { nodeId, handleId }: { nodeId: string | null; handleId: string | null }) => {
      dragSourceRef.current.srcType = getPortType(nodeId, handleId);
    },
    [getPortType]
  );

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const target = (event as MouseEvent).target as HTMLElement | null;
      const droppedOnHandle = target?.closest(".react-flow__handle");
      if (!droppedOnHandle) return; // dropped on canvas → not an invalid connection attempt

      const tgtNodeEl   = droppedOnHandle.closest("[data-id]");
      const tgtNodeId   = tgtNodeEl?.getAttribute("data-id") ?? null;
      const tgtHandleId = droppedOnHandle.getAttribute("data-handleid");
      const srcType = dragSourceRef.current.srcType;
      const tgtType = getPortType(tgtNodeId, tgtHandleId);

      if (srcType && tgtType) {
        const allowed = CONNECTION_COMPAT[srcType] ?? [];
        if (!allowed.includes(tgtType)) {
          toast({
            variant: "destructive",
            title: "Incompatible port types",
            description: `Cannot connect ${srcType} → ${tgtType}`,
            duration: 3000,
          });
        }
      }
      dragSourceRef.current.srcType = null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getPortType, toast]
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      <ProjectHeader projects={projects} isLoading={projectsLoading} />

      {/* Read-only floating banner */}
      {isReadonly && (
        <ReadOnlyBanner
          templateName={templateName}
          onDuplicate={handleDuplicate}
          isDuplicating={isDuplicating}
        />
      )}

      {/* Sub-header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 bg-card/30 px-4 py-3 flex items-center gap-3 shrink-0"
      >
        {/* Sidebar tab toggles — hidden in readonly mode */}
        {!isReadonly && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost" size="sm"
              onClick={() => {
                setSidebarTab("nodes");
                setSidebarOpen((v) => sidebarTab === "nodes" ? !v : true);
              }}
              className={cn("text-muted-foreground hover:text-foreground w-8 h-8 p-0", sidebarOpen && sidebarTab === "nodes" && "bg-white/[0.06] text-foreground")}
              title="Node library"
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => {
                setSidebarTab("media");
                setSidebarOpen((v) => sidebarTab === "media" ? !v : true);
              }}
              className={cn("text-muted-foreground hover:text-foreground w-8 h-8 p-0", sidebarOpen && sidebarTab === "media" && "bg-white/[0.06] text-foreground")}
              title="Media assets"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => {
                setSidebarTab("generated");
                setSidebarOpen((v) => sidebarTab === "generated" ? !v : true);
              }}
              className={cn("text-muted-foreground hover:text-foreground w-8 h-8 p-0", sidebarOpen && sidebarTab === "generated" && "bg-white/[0.06] text-[#ec4899]")}
              title="Generated media"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="h-4 w-px bg-border" />

        <Button
          variant="ghost" size="sm"
          onClick={async () => {
            // Save before leaving
            if (templateId) {
              // Save to localStorage
              const localStorageKey = `template-canvas-${templateId}`;
              localStorage.setItem(localStorageKey, JSON.stringify({ nodes, edges }));
              console.log("Saved to localStorage before navigation:", localStorageKey);

              // Also try to save to backend
              try {
                console.log("Saving before navigation with nodes:", nodes.length, "edges:", edges.length);
                const payload = {
                  path: { template_id: templateId },
                  body: {
                    current_graph_json: { nodes: nodes as unknown[], edges: edges as unknown[] },
                  },
                };
                const response = await updateTemplateV1TemplatesTemplateIdPatch(payload);
                console.log("Save response:", response);
              } catch (err) {
                console.error("Failed to save before navigation:", err);
                // Continue anyway — localStorage is already saved
              }
            }
            router.push(`/projects/${projectId}`);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Overview
        </Button>

        <div className="h-4 w-px bg-border" />

        {/* Template name — right-click for Save / Rename */}
        <span
          className="text-sm font-medium cursor-context-menu select-none hover:text-primary transition-colors"
          onContextMenu={(e) => { e.preventDefault(); setTemplateMenuPos({ x: e.clientX, y: e.clientY }); }}
          title="Right-click for options"
        >
          {templateName || `Template ${templateId.slice(0, 8)}…`}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {isReadonly ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white/30">
              <Eye className="w-3 h-3" />
              Read-only preview
            </div>
          ) : (
            <>
              {execution.activeJobId && (
                <span className="text-xs text-muted-foreground/60 font-mono">
                  {execution.activeJobId.slice(0, 12)}…
                </span>
              )}
              <Button
                size="sm"
                onClick={handleRun}
                disabled={execution.isSubmitting}
                className="gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                {execution.isSubmitting ? "Running…" : "Run"}
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
        {!isReadonly && (
          sidebarTab === "nodes"
            ? <NodeLibrarySidebar isOpen={sidebarOpen} nodesByCategory={nodeLibrary} />
            : sidebarTab === "media"
              ? <MediaAssetsPanel   isOpen={sidebarOpen} projectId={projectId} />
              : <GeneratedMediaPanel isOpen={sidebarOpen} nodes={nodes} />
        )}

        <div className="flex-1" style={{ minHeight: 0 }}>
          <ReactFlow
            nodes={nodesWithCallbacks as any}
            edges={edges}
            onNodesChange={isReadonly ? undefined : onNodesChange}
            onEdgesChange={isReadonly ? undefined : onEdgesChange}
            onConnect={isReadonly ? undefined : onConnect}
            isValidConnection={isReadonly ? undefined : isValidConnection}
            onConnectStart={isReadonly ? undefined : handleConnectStart as any}
            onConnectEnd={isReadonly ? undefined : handleConnectEnd as any}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={(instance) => { rfInstanceRef.current = instance; }}
            onPaneContextMenu={isReadonly ? undefined : handlePaneContextMenu as any}
            onNodeContextMenu={isReadonly ? undefined : handleNodeContextMenu as any}
            onPaneClick={isReadonly ? undefined : handlePaneClick}
            onDrop={isReadonly ? undefined : handleDrop}
            onDragOver={isReadonly ? undefined : handleDragOver}
            nodesDraggable={!isReadonly}
            nodesConnectable={!isReadonly}
            elementsSelectable={!isReadonly}
            deleteKeyCode={isReadonly ? null : ["Delete", "Backspace"]}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            proOptions={{ hideAttribution: true }}
            colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.07)" />
            <Controls className="!bg-card/60 !border-border/40 !backdrop-blur-sm !rounded-lg" showInteractive={!isReadonly} />
            <MiniMap
              zoomable pannable
              className="!bg-card/50 !border-border/30 !backdrop-blur-sm !rounded-lg"
              nodeColor={(n) => {
                const d = (n as any).data;
                if (d?.categoryTag === "text")  return "#a855f7";
                if (d?.categoryTag === "image") return "#ec4899";
                if (d?.categoryTag === "video") return "#ef4444";
                return "#64748b";
              }}
            />
          </ReactFlow>
        </div>
      </div>

      {/* Floating menus — disabled in readonly mode */}
      {!isReadonly && (
        <>
          <ContextMenu
            position={contextMenu?.screenPos ?? null}
            nodesByCategory={nodeLibrary}
            onAddNode={(s) => handleAddNode(s, contextMenu?.flowPos ?? { x: 100, y: 100 })}
            onClose={() => setContextMenu(null)}
          />
          <NodeContextMenu
            position={nodeContextMenu?.pos ?? null}
            onDelete={() => { if (nodeContextMenu) deleteNode(nodeContextMenu.nodeId); }}
            onClose={() => setNodeContextMenu(null)}
          />
          <TemplateMenu
            position={templateMenuPos}
            templateId={templateId}
            nodes={nodes}
            edges={edges}
            onRename={setTemplateName}
            onClose={() => setTemplateMenuPos(null)}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
