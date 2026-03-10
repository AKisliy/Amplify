"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { ProjectHeader } from "@/components/ProjectHeader";
import { TextInputNode } from "@/components/ui/flow/text-input-node";
import { VisualizeTextNode } from "@/components/ui/flow/visualize-text-node";
import { GenerateTextNode } from "@/components/ui/flow/generate-text-node";
import { StatusEdge } from "@/components/ui/flow/status-edge";
import type { Model } from "@/components/ui/flow/model-selector";
import { useTheme } from "next-themes";

// ---------------------------------------------------------------------------
// Node / Edge type registrations
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
  "text-input": TextInputNode as unknown as NodeTypes[string],
  "visualize-text": VisualizeTextNode as unknown as NodeTypes[string],
  "generate-text": GenerateTextNode as unknown as NodeTypes[string],
};

const edgeTypes: EdgeTypes = {
  status: StatusEdge,
};

// ---------------------------------------------------------------------------
// Mock template data
// ---------------------------------------------------------------------------

interface MockTemplate {
  id: string;
  name: string;
  nodes: object[];
  edges: object[];
}

const MOCK_TEMPLATES: Record<string, MockTemplate> = {
  "tpl-001": {
    id: "tpl-001",
    name: "Product Showcase",
    nodes: [
      {
        id: "1",
        type: "text-input",
        position: { x: 80, y: 120 },
        data: {
          status: "idle",
          config: { value: "Introduce the product with energy and enthusiasm. Highlight the key benefit in the first 3 seconds." },
        },
        style: { width: 320, height: 220 },
      },
      {
        id: "2",
        type: "generate-text",
        position: { x: 480, y: 80 },
        data: {
          status: "idle",
          config: { model: "llama-3.3-70b-versatile" as Model },
          dynamicHandles: { tools: [] },
        },
      },
      {
        id: "3",
        type: "visualize-text",
        position: { x: 900, y: 80 },
        data: {
          status: "success",
          input: "## Ambassador Script\n\nHey everyone! Check out this **amazing product** — it changed my daily routine completely.\n\n- Key benefit 1\n- Key benefit 2\n- Special offer inside!\n\n*Swipe up for the link!*",
        },
        style: { width: 360, height: 280 },
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", sourceHandle: "result", targetHandle: "prompt", type: "status" },
      { id: "e2-3", source: "2", target: "3", sourceHandle: "result", targetHandle: "input", type: "status" },
    ],
  },
  "tpl-002": {
    id: "tpl-002",
    name: "Day-in-the-life",
    nodes: [
      {
        id: "1",
        type: "text-input",
        position: { x: 60, y: 100 },
        data: {
          status: "idle",
          config: { value: "Morning routine showcase. Be authentic, casual, and relatable. Show how the product fits naturally into everyday life." },
        },
        style: { width: 320, height: 240 },
      },
      {
        id: "2",
        type: "generate-text",
        position: { x: 460, y: 60 },
        data: {
          status: "processing",
          config: { model: "deepseek-chat" as Model },
          dynamicHandles: {
            tools: [
              { id: "morning-hook", name: "morning_hook", description: "Opening hook for morning scene" },
              { id: "activity-cta", name: "activity_cta", description: "Call-to-action for activities" },
            ],
          },
        },
      },
      {
        id: "3",
        type: "visualize-text",
        position: { x: 900, y: 60 },
        data: {
          status: "processing",
          input: undefined,
        },
        style: { width: 340, height: 260 },
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", sourceHandle: "result", targetHandle: "prompt", type: "status" },
      { id: "e2-3", source: "2", target: "3", sourceHandle: "result", targetHandle: "input", type: "status" },
    ],
  },
  "tpl-003": {
    id: "tpl-003",
    name: "Unboxing Experience",
    nodes: [
      {
        id: "sys",
        type: "text-input",
        position: { x: 60, y: 40 },
        data: {
          status: "idle",
          config: { value: "You are an enthusiastic content creator. Generate exciting unboxing commentary that builds anticipation and highlights product quality." },
        },
        style: { width: 320, height: 220 },
      },
      {
        id: "prompt",
        type: "text-input",
        position: { x: 60, y: 300 },
        data: {
          status: "idle",
          config: { value: "Create a 60-second unboxing script for a premium skincare set. Include: initial reaction, texture description, scent notes, and first impressions." },
        },
        style: { width: 320, height: 240 },
      },
      {
        id: "gen",
        type: "generate-text",
        position: { x: 460, y: 160 },
        data: {
          status: "success",
          config: { model: "llama-3.3-70b-versatile" as Model },
          dynamicHandles: { tools: [] },
        },
      },
      {
        id: "out",
        type: "visualize-text",
        position: { x: 880, y: 100 },
        data: {
          status: "success",
          input: "# Unboxing Script\n\n**[Opening]** Oh my gosh, it finally arrived! Look at this packaging — already 10/10.\n\n**[Reveal]** The texture is *unbelievably silky*. And that scent? Jasmine and sandalwood — absolutely divine.\n\n**[CTA]** Link in bio for 20% off your first order. You will not regret this!",
        },
        style: { width: 360, height: 300 },
      },
    ],
    edges: [
      { id: "e-sys-gen", source: "sys", target: "gen", sourceHandle: "result", targetHandle: "system", type: "status" },
      { id: "e-prompt-gen", source: "prompt", target: "gen", sourceHandle: "result", targetHandle: "prompt", type: "status" },
      { id: "e-gen-out", source: "gen", target: "out", sourceHandle: "result", targetHandle: "input", type: "status" },
    ],
  },
  "tpl-004": {
    id: "tpl-004",
    name: "Tutorial & How-To",
    nodes: [
      {
        id: "1",
        type: "text-input",
        position: { x: 60, y: 120 },
        data: {
          status: "idle",
          config: { value: "Step-by-step tutorial for using our app. Keep it under 90 seconds. Be clear, concise, and friendly." },
        },
        style: { width: 320, height: 220 },
      },
      {
        id: "2",
        type: "generate-text",
        position: { x: 460, y: 80 },
        data: {
          status: "idle",
          config: { model: "llama-3.1-8b-instant" as Model },
          dynamicHandles: {
            tools: [
              { id: "step-list", name: "step_list", description: "Individual step breakdowns" },
            ],
          },
        },
      },
      {
        id: "3",
        type: "visualize-text",
        position: { x: 880, y: 80 },
        data: {
          status: "idle",
          input: undefined,
        },
        style: { width: 340, height: 260 },
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", sourceHandle: "result", targetHandle: "prompt", type: "status" },
      { id: "e2-3", source: "2", target: "3", sourceHandle: "result", targetHandle: "input", type: "status" },
    ],
  },
};

function getFallbackTemplate(id: string): MockTemplate {
  return {
    id,
    name: "Template",
    nodes: [
      {
        id: "start",
        type: "text-input",
        position: { x: 80, y: 150 },
        data: { status: "idle", config: { value: "Enter your prompt here..." } },
        style: { width: 300, height: 200 },
      },
      {
        id: "end",
        type: "visualize-text",
        position: { x: 480, y: 150 },
        data: { status: "idle", input: undefined },
        style: { width: 300, height: 200 },
      },
    ],
    edges: [{ id: "e-start-end", source: "start", target: "end", sourceHandle: "result", targetHandle: "input", type: "status" }],
  };
}

// ---------------------------------------------------------------------------

export default function TemplateCanvasPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const templateId = params?.templateId as string;

  const { resolvedTheme } = useTheme();

  const { projects, isLoading: projectsLoading } = useProjects();

  const template = MOCK_TEMPLATES[templateId] ?? getFallbackTemplate(templateId);

  const [nodes, setNodes, onNodesChange] = useNodesState(template.nodes as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState(template.edges as any);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: "status" }, eds)),
    [setEdges]
  );

  // Handlers wired into GenerateTextNode props
  const handleModelChange = useCallback(
    (nodeId: string) => (model: Model) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, model } } }
            : n
        )
      );
    },
    [setNodes]
  );

  const handleCreateTool = useCallback(
    (nodeId: string) => (name: string, description?: string) => {
      const id = `${name}-${Date.now()}`;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const data = n.data as any;
          const tools = data.dynamicHandles?.tools ?? [];
          if (tools.some((t: any) => t.name === name)) return n;
          return {
            ...n,
            data: {
              ...data,
              dynamicHandles: { tools: [...tools, { id, name, description }] },
            },
          };
        })
      );
      return true;
    },
    [setNodes]
  );

  const handleRemoveTool = useCallback(
    (nodeId: string) => (handleId: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const data = n.data as any;
          return {
            ...n,
            data: {
              ...data,
              dynamicHandles: {
                tools: (data.dynamicHandles?.tools ?? []).filter((t: any) => t.id !== handleId),
              },
            },
          };
        })
      );
    },
    [setNodes]
  );

  const handleUpdateTool = useCallback(
    (nodeId: string) => (toolId: string, newName: string, newDescription?: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const data = n.data as any;
          return {
            ...n,
            data: {
              ...data,
              dynamicHandles: {
                tools: (data.dynamicHandles?.tools ?? []).map((t: any) =>
                  t.id === toolId ? { ...t, name: newName, description: newDescription } : t
                ),
              },
            },
          };
        })
      );
      return true;
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => () => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  const handleTextChange = useCallback(
    (nodeId: string) => (value: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, value } } }
            : n
        )
      );
    },
    [setNodes]
  );

  // Build node data with bound callbacks
  const nodesWithHandlers = nodes.map((node) => {
    if (node.type === "text-input") {
      return {
        ...node,
        data: {
          ...node.data,
          onTextChange: handleTextChange(node.id),
          onDeleteNode: handleDeleteNode(node.id),
        },
      };
    }
    if (node.type === "generate-text") {
      return {
        ...node,
        data: {
          ...node.data,
          onModelChange: handleModelChange(node.id),
          onCreateTool: handleCreateTool(node.id),
          onRemoveTool: handleRemoveTool(node.id),
          onUpdateTool: handleUpdateTool(node.id),
          onDeleteNode: handleDeleteNode(node.id),
        },
      };
    }
    if (node.type === "visualize-text") {
      return {
        ...node,
        data: {
          ...node.data,
          onDeleteNode: handleDeleteNode(node.id),
        },
      };
    }
    return node;
  });

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <ProjectHeader projects={projects} isLoading={projectsLoading} />

      {/* Sub-header with back button and template name */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 bg-card/30 px-6 py-3 flex items-center gap-4"
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
        <h1 className="text-sm font-medium">{template.name}</h1>
      </motion.div>

      {/* React Flow canvas */}
      <div className="flex-1 w-full" style={{ minHeight: 0 }}>
        <ReactFlow
          nodes={nodesWithHandlers as any}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap zoomable pannable/>
        </ReactFlow>
      </div>
    </div>
  );
}
