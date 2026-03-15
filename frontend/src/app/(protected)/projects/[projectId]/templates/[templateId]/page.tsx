"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Play, PanelLeft, Image as ImageIcon } from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { ProjectHeader } from "@/components/ProjectHeader";
import { useTheme } from "next-themes";
import { updateTemplateV1TemplatesTemplateIdPatch } from "@/lib/api/template-service";

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
import { useCanvasStore } from "@/features/canvas/hooks/useCanvasStore";
import { NODE_REGISTRY, getNodesByCategory } from "@/features/canvas/registry";
import { nodeDefToCanvasNode } from "@/features/canvas/lib/schemaMapper";
import { PREVIEW_SCHEMA_NAMES } from "@/features/canvas/registry/preview-schemas";
import type { CanvasNode } from "@/features/canvas/types";
import { getTemplateV1TemplatesTemplateIdGet } from "@/lib/api/template-service";

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

// ---------------------------------------------------------------------------
// Seed canvas
// ---------------------------------------------------------------------------

function buildSeedNodes(): CanvasNode[] {
  const geminiDef = NODE_REGISTRY["GeminiNodeAmplify"];
  const veo3Def   = NODE_REGISTRY["Veo3VideoGenerationNodeAmplify"];
  const nodes: CanvasNode[] = [];
  if (geminiDef) nodes.push(nodeDefToCanvasNode("GeminiNodeAmplify", geminiDef, { x: 80, y: 100 }, "node-gemini"));
  if (veo3Def)   nodes.push(nodeDefToCanvasNode("Veo3VideoGenerationNodeAmplify", veo3Def, { x: 500, y: 80 }, "node-veo3"));
  return nodes;
}

const SEED_NODES = buildSeedNodes();
const SEED_EDGES = SEED_NODES.length >= 2
  ? [{ id: "e-gemini-veo3", source: "node-gemini", sourceHandle: "text", target: "node-veo3", targetHandle: "prompt", type: "status" as const, data: { flowing: false, error: false } }]
  : [];

const NODE_LIBRARY = getNodesByCategory();

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type SidebarTab = "nodes" | "media";

export default function TemplateCanvasPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId  = params?.projectId  as string;
  const templateId = params?.templateId as string;

  const { resolvedTheme } = useTheme();
  const { projects, isLoading: projectsLoading } = useProjects();

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

  // Auto-save to localStorage on unmount
  useEffect(() => {
    return () => {
      if (!templateId || nodes.length === 0) return;
      // Save to localStorage as backup
      const key = `template-canvas-${templateId}`;
      localStorage.setItem(key, JSON.stringify({ nodes, edges }));
      console.log("Auto-saved to localStorage:", key);

      // Also try to save to backend (may fail if not implemented yet)
      (async () => {
        try {
          await updateTemplateV1TemplatesTemplateIdPatch({
            path: { template_id: templateId },
            body: {
              current_graph_json: { nodes: nodes as unknown[], edges: edges as unknown[] },
            },
          });
        } catch {
          // Silently fail on unmount
        }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load saved graph ────────────────────────────────────────────────────────
  const [initialNodes, setInitialNodes] = useState(SEED_NODES);
  const [initialEdges, setInitialEdges] = useState(SEED_EDGES);

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      try {
        // 1. Try localStorage first
        const localStorageKey = `template-canvas-${templateId}`;
        const localStorageData = localStorage.getItem(localStorageKey);
        if (localStorageData) {
          try {
            const parsedLocal = JSON.parse(localStorageData);
            if (parsedLocal.nodes && Array.isArray(parsedLocal.nodes) && parsedLocal.nodes.length > 0) {
              console.log("Loaded from localStorage:", parsedLocal.nodes.length, "nodes");
              setInitialNodes(parsedLocal.nodes as CanvasNode[]);
              if (parsedLocal.edges) setInitialEdges(parsedLocal.edges as any[]);
              return; // Use localStorage version, skip backend fetch
            }
          } catch (e) {
            console.warn("Failed to parse localStorage data:", e);
          }
        }

        // 2. Fall back to backend
        console.log("Fetching template from backend:", templateId);
        const response = await getTemplateV1TemplatesTemplateIdGet({ path: { template_id: templateId } });
        console.log("Template response:", response);
        const savedGraph = response?.data?.current_graph_json;
        console.log("Saved graph raw:", savedGraph, "Type:", typeof savedGraph);

        if (savedGraph) {
          // Try to parse if it's a string (JSON)
          let parsedGraph = savedGraph;
          if (typeof savedGraph === "string") {
            try {
              parsedGraph = JSON.parse(savedGraph);
              console.log("Parsed graph from string:", parsedGraph);
            } catch (parseErr) {
              console.error("Failed to parse graph JSON string:", parseErr);
              return;
            }
          }

          if (typeof parsedGraph === "object" && "nodes" in parsedGraph && "edges" in parsedGraph) {
            const nodes = (parsedGraph.nodes as unknown[]) || [];
            const edges = (parsedGraph.edges as unknown[]) || [];
            console.log("Loaded from backend:", nodes.length, "nodes");
            if (Array.isArray(nodes) && nodes.length > 0) {
              setInitialNodes(nodes as CanvasNode[]);
            }
            if (Array.isArray(edges)) {
              setInitialEdges(edges as any[]);
            }
          } else {
            console.warn("Saved graph doesn't have expected structure:", parsedGraph);
          }
        } else {
          console.log("No saved graph found on backend, using seed nodes");
        }
      } catch (err) {
        console.error("Failed to load saved template graph:", err);
      }
    })();
  }, [templateId]);

  // ── Canvas store ─────────────────────────────────────────────────────────────
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, deleteNode, deleteSelectedElements,
    updateNodeConfig,
    execution, submitWorkflow,
  } = useCanvasStore({ initialNodes, initialEdges });

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
      const def = NODE_REGISTRY[schemaName];
      if (!def) return;
      let nodeType: "amplify-node" | "preview-node" | "import-media-node" = "amplify-node";
      if (schemaName === "ImportMediaNode") nodeType = "import-media-node";
      else if (PREVIEW_SCHEMA_NAMES.has(schemaName)) nodeType = "preview-node";
      const newNode  = nodeDefToCanvasNode(schemaName, def, position, `node-${crypto.randomUUID().slice(0, 8)}`, nodeType);
      if (initialConfig) newNode.data.config = { ...newNode.data.config, ...initialConfig };
      addNode(newNode);
    },
    [addNode]
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
        const payload = JSON.parse(mediaRaw) as { url: string; mediaType: "image" | "video" };
        const configKey = payload.mediaType === "video" ? "video_uuid" : "image_uuid";
        handleAddNode("ImportMediaNode", position, { [configKey]: payload.url });
      } catch { /* invalid payload */ }
    }
  }, [handleAddNode]);

  // ── Run ──────────────────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    await submitWorkflow(crypto.randomUUID());
  }, [submitWorkflow]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <ProjectHeader projects={projects} isLoading={projectsLoading} />

      {/* Sub-header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 bg-card/30 px-4 py-3 flex items-center gap-3 shrink-0"
      >
        {/* Sidebar tab toggles */}
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
        </div>

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
        </div>
      </motion.div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
        {sidebarTab === "nodes"
          ? <NodeLibrarySidebar isOpen={sidebarOpen} nodesByCategory={NODE_LIBRARY} />
          : <MediaAssetsPanel   isOpen={sidebarOpen} projectId={projectId} />
        }

        <div className="flex-1" style={{ minHeight: 0 }}>
          <ReactFlow
            nodes={nodesWithCallbacks as any}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={(instance) => { rfInstanceRef.current = instance; }}
            onPaneContextMenu={handlePaneContextMenu as any}
            onNodeContextMenu={handleNodeContextMenu as any}
            onPaneClick={handlePaneClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            proOptions={{ hideAttribution: true }}
            colorMode={resolvedTheme === "dark" ? "dark" : "light"}
            deleteKeyCode="Delete"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.07)" />
            <Controls className="!bg-card/60 !border-border/40 !backdrop-blur-sm !rounded-lg" />
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

      {/* Floating menus */}
      <ContextMenu
        position={contextMenu?.screenPos ?? null}
        nodesByCategory={NODE_LIBRARY}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
