"use client";

// =============================================================================
// Library Template Canvas Page
// Read-only preview of a /v1/library-templates/{id} with Duplicate CTA
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Eye,
  Loader2,
} from "lucide-react";
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

import { Button }      from "@/components/ui/button";
import { useToast }    from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { createTemplateV1TemplatesPost } from "@/lib/api/template-service";
import { getLibraryTemplate, type LibraryTemplate } from "@/features/templates/hooks/useLibraryTemplates";

import { AmplifyNode }      from "@/features/canvas/components/AmplifyNode";
import { PreviewNode }      from "@/features/canvas/components/PreviewNode";
import { ImportMediaNode }  from "@/features/canvas/components/ImportMediaNode";
import { FlowingEdge }      from "@/features/canvas/components/FlowingEdge";
import { useCanvasStore }   from "@/features/canvas/hooks/useCanvasStore";
import { useNodeRegistry }  from "@/features/canvas/hooks/useNodeRegistry";
import type { CanvasNode, CanvasEdge } from "@/features/canvas/types";

// ---------------------------------------------------------------------------
// Node / Edge type registrations (same as main canvas)
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
  "amplify-node":    AmplifyNode      as unknown as NodeTypes[string],
  "preview-node":    PreviewNode      as unknown as NodeTypes[string],
  "import-media-node": ImportMediaNode as unknown as NodeTypes[string],
};

const edgeTypes: EdgeTypes = { status: FlowingEdge };

// ---------------------------------------------------------------------------
// Read-only banner
// ---------------------------------------------------------------------------

function ReadOnlyBanner({
  onDuplicate,
  isDuplicating,
}: {
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
          background: "rgba(15,15,20,0.78)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
      >
        <div className="flex items-center gap-1.5 text-white/40 text-xs shrink-0">
          <Eye className="w-3.5 h-3.5" />
          <span>
            You&apos;re viewing a{" "}
            <em className="not-italic font-semibold text-white/60">read-only</em>{" "}
            version of this workflow
          </span>
        </div>

        <div className="w-px h-4 bg-white/10 shrink-0" />

        <motion.button
          id="btn-duplicate-to-project"
          onClick={onDuplicate}
          disabled={isDuplicating}
          whileHover={isDuplicating ? {} : { scale: 1.04 }}
          whileTap={isDuplicating ? {} : { scale: 0.96 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
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

export default function LibraryTemplatePreviewPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId  = params?.projectId  as string;
  const templateId = params?.templateId as string;

  const { resolvedTheme } = useTheme();
  const { registry } = useNodeRegistry();

  const { toast } = useToast();
  const rfInstanceRef = useRef<any>(null);

  const [template, setTemplate]     = useState<LibraryTemplate | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // ── Canvas store (read-only — we never write back) ───────────────────────
  const { nodes, edges, setNodes, setEdges } = useCanvasStore({});

  // ── Load library template ────────────────────────────────────────────────
  useEffect(() => {
    if (!templateId) return;
    (async () => {
      try {
        const t = await getLibraryTemplate(templateId);
        setTemplate(t);

        // Parse graph_json into canvas nodes/edges
        const g = t.graph_json;
        if (g && typeof g === "object" && "nodes" in g && "edges" in g) {
          const pNodes = (g.nodes as unknown[]) || [];
          const pEdges = (g.edges as unknown[]) || [];
          if (Array.isArray(pNodes) && pNodes.length > 0) {
            setNodes(pNodes as CanvasNode[]);
            if (Array.isArray(pEdges)) setEdges(pEdges as CanvasEdge[]);
          }
        }
      } catch (err) {
        console.error("Failed to load library template:", err);
        toast({ variant: "destructive", title: "Could not load template", duration: 4000 });
      }
    })();
  }, [templateId, setNodes, setEdges, toast]);

  // ── Nodes with empty callbacks (no-op in readonly) ───────────────────────
  const nodesWithCallbacks: CanvasNode[] = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onUpdateConfig: () => {},
          onDeleteNode:   () => {},
        },
      })) as CanvasNode[],
    [nodes]
  );

  // ── Duplicate → create a copy in user's project ──────────────────────────
  const handleDuplicate = useCallback(async () => {
    if (!projectId || !template || isDuplicating) return;
    setIsDuplicating(true);
    try {
      const { data: newTpl } = await createTemplateV1TemplatesPost({
        body: {
          project_id: projectId,
          name: `Copy of ${template.name}`,
          description: template.description ?? undefined,
          current_graph_json: template.graph_json ?? {},
        },
        throwOnError: true,
      });
      toast({
        title: "Duplicated!",
        description: `"${newTpl!.name}" added to your templates.`,
        duration: 5000,
      });
      router.push(`/projects/${projectId}/templates/${newTpl!.id}`);
    } catch (err) {
      console.error("Duplicate failed:", err);
      toast({
        variant: "destructive",
        title: "Duplicate failed",
        description: "Please try again.",
        duration: 4000,
      });
    } finally {
      setIsDuplicating(false);
    }
  }, [projectId, template, isDuplicating, router, toast]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">

      {/* Floating read-only banner */}
      <ReadOnlyBanner onDuplicate={handleDuplicate} isDuplicating={isDuplicating} />

      {/* Sub-header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 bg-card/30 px-4 py-3 flex items-center gap-3 shrink-0"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}`)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Overview
        </Button>

        <div className="h-4 w-px bg-border" />

        <span className="text-sm font-medium text-foreground/70 truncate">
          {template?.name ?? "Loading…"}
        </span>

        <div className="ml-auto">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white/30">
            <Eye className="w-3 h-3" />
            Read-only preview
          </div>
        </div>
      </motion.div>

      {/* Canvas */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        <ReactFlow
          nodes={nodesWithCallbacks as any}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={(instance) => { rfInstanceRef.current = instance; }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          proOptions={{ hideAttribution: true }}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.07)" />
          <Controls
            className="!bg-card/60 !border-border/40 !backdrop-blur-sm !rounded-lg"
            showInteractive={false}
          />
          <MiniMap
            zoomable
            pannable
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
  );
}
