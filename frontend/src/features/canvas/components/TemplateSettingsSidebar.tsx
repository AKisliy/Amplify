"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Check, CalendarDays, Captions, PanelRightClose, PanelRightOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAutolists } from "@/features/autolists/hooks/useAutolists";
import type { PostDescriptionConfig } from "@/lib/api/generated/template-service/types.gen";
import type { CanvasNode } from "../types";

export type { PostDescriptionConfig };

// ---------------------------------------------------------------------------
// Caption styles — mirrors video-editor/captions/styles.py (visual props only)
// ---------------------------------------------------------------------------

interface CaptionStyleDef {
  code: string;
  name: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bold: boolean;
  bgColor?: string;
}

const CAPTION_STYLES: CaptionStyleDef[] = [
  { code: "default", name: "Default", color: "#ffffff", strokeColor: "#000000", strokeWidth: 3, bold: false },
  { code: "bold",    name: "Bold",    color: "#ffffff", strokeColor: "#000000", strokeWidth: 4, bold: true  },
  { code: "minimal", name: "Minimal", color: "#ffffff", strokeColor: "#000000", strokeWidth: 1, bold: false },
  { code: "yellow",  name: "Yellow",  color: "#ffff00", strokeColor: "#000000", strokeWidth: 3, bold: true  },
  { code: "box",     name: "Box",     color: "#ffffff", strokeColor: "transparent", strokeWidth: 0, bold: false, bgColor: "rgba(0,0,0,0.65)" },
];

const VIDEO_EDITOR_SCHEMAS = new Set(["BaseUGCEditingNode", "BatchUGCEditingNode"]);

function findCaptionsNode(nodes: CanvasNode[]): CanvasNode | null {
  return (
    nodes.find(
      (n) =>
        VIDEO_EDITOR_SCHEMAS.has(n.data.schemaName) &&
        n.data.config.add_captions === true
    ) ?? null
  );
}

function buildTextShadow(color: string, width: number): string {
  if (width === 0 || color === "transparent") return "none";
  const w = Math.min(width, 2);
  const steps: string[] = [];
  for (let dx = -w; dx <= w; dx++) {
    for (let dy = -w; dy <= w; dy++) {
      if (dx !== 0 || dy !== 0) steps.push(`${dx}px ${dy}px 0 ${color}`);
    }
  }
  return steps.join(",");
}

// ---------------------------------------------------------------------------
// StyleCard
// ---------------------------------------------------------------------------

function StyleCard({ style, selected, onClick }: {
  style: CaptionStyleDef;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1.5 p-2 rounded-lg border transition-all",
        "hover:border-white/20 hover:bg-white/[0.04]",
        selected ? "border-primary/60 bg-primary/10" : "border-white/[0.07] bg-white/[0.02]"
      )}
    >
      <div
        className="w-full h-9 rounded flex items-center justify-center"
        style={{ background: "#12121e" }}
      >
        <span
          className="text-sm select-none"
          style={{
            color: style.color,
            fontWeight: style.bold ? 700 : 400,
            textShadow: buildTextShadow(style.strokeColor, style.strokeWidth),
            background: style.bgColor,
            padding: style.bgColor ? "1px 6px" : undefined,
            borderRadius: style.bgColor ? "2px" : undefined,
          }}
        >
          Amplify
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground/60 text-center w-full truncate">
        {style.name}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// PositionPicker — 9:16 with draggable caption dot (fixed 120px wide)
// ---------------------------------------------------------------------------

function PositionPicker({ position, onPositionChange, styleCode }: {
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  styleCode: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const style = CAPTION_STYLES.find((s) => s.code === styleCode) ?? CAPTION_STYLES[0];

  const computePos = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      onPositionChange({
        x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      });
    },
    [onPositionChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      computePos(e.clientX, e.clientY);
      const onMove = (ev: MouseEvent) => computePos(ev.clientX, ev.clientY);
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [computePos]
  );

  return (
    <div className="flex-1 min-h-0 flex justify-center">
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="relative rounded-lg overflow-hidden cursor-crosshair select-none"
        style={{
          height: "100%",
          aspectRatio: "9 / 16",
          background: "linear-gradient(160deg, #0f0f1a 0%, #1a1025 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Decorative lines */}
        {[0.22, 0.42, 0.62].map((top) => (
          <div
            key={top}
            className="absolute left-3 right-3 h-px rounded-full"
            style={{ top: `${top * 100}%`, background: "rgba(255,255,255,0.06)" }}
          />
        ))}

        {/* Caption label at current position */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${position.x * 100}%`,
            top: `${position.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className="text-[7px] whitespace-nowrap px-1 py-0.5 rounded"
            style={{
              color: style.color,
              fontWeight: style.bold ? 700 : 400,
              textShadow: buildTextShadow(style.strokeColor, 1),
              background: style.bgColor ?? "transparent",
            }}
          >
            Caption
          </span>
        </div>

        {/* Drag handle */}
        <div
          className="absolute w-2 h-2 rounded-full pointer-events-none ring-1 ring-white/40"
          style={{
            left: `${position.x * 100}%`,
            top: `${position.y * 100}%`,
            transform: "translate(-50%, -50%)",
            background: "rgba(255,255,255,0.2)",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type SettingsTab = "autolist" | "captions";

const SIDEBAR_WIDTH = 260;
const ICON_STRIP_WIDTH = 48;

export interface TemplateSettingsSidebarProps {
  projectId: string;
  autoListIds: string[];
  onAutoListIdsChange: (ids: string[]) => void;
  postDescriptionConfig: PostDescriptionConfig | null;
  onPostDescriptionConfigChange: (config: PostDescriptionConfig | null) => void;
  nodes: CanvasNode[];
  updateNodeConfig: (nodeId: string, field: string, value: unknown) => void;
}

export function TemplateSettingsSidebar({
  projectId,
  autoListIds,
  onAutoListIdsChange,
  postDescriptionConfig,
  onPostDescriptionConfigChange,
  nodes,
  updateNodeConfig,
}: TemplateSettingsSidebarProps) {
  const [expanded, setExpanded]     = useState(false);
  const [activeTab, setActiveTab]   = useState<SettingsTab>("autolist");
  const { autolists, isLoading }    = useAutolists(projectId);

  // ── Caption state ──────────────────────────────────────────────────────────
  const captionsNode = findCaptionsNode(nodes);

  const [styleCode, setStyleCode] = useState<string>(
    (captionsNode?.data.config.caption_style_code as string | undefined) ?? "default"
  );
  const [position, setPosition] = useState({ x: 0.5, y: 0.83 });

  // Sync from node when node identity changes
  useEffect(() => {
    if (!captionsNode) return;
    setStyleCode(
      (captionsNode.data.config.caption_style_code as string | undefined) ?? "default"
    );
    setPosition({
      x: (captionsNode.data.config.caption_position_x as number | undefined) ?? 0.5,
      y: (captionsNode.data.config.caption_position_y as number | undefined) ?? 0.83,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captionsNode?.id]);

  const handleStyleSelect = useCallback(
    (code: string) => {
      setStyleCode(code);
      if (captionsNode) updateNodeConfig(captionsNode.id, "caption_style_code", code);
    },
    [captionsNode, updateNodeConfig]
  );

  const handlePositionChange = useCallback(
    (pos: { x: number; y: number }) => {
      setPosition(pos);
      if (captionsNode) {
        updateNodeConfig(captionsNode.id, "caption_position_x", Math.round(pos.x * 100) / 100);
        updateNodeConfig(captionsNode.id, "caption_position_y", Math.round(pos.y * 100) / 100);
      }
    },
    [captionsNode, updateNodeConfig]
  );

  // ── Autolist ───────────────────────────────────────────────────────────────
  const toggleAutoList = (id: string) => {
    const next = autoListIds.includes(id)
      ? autoListIds.filter((x) => x !== id)
      : [...autoListIds, id];
    onAutoListIdsChange(next);
  };

  const openTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setExpanded(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={300}>
      <motion.aside
        animate={{ width: expanded ? SIDEBAR_WIDTH : ICON_STRIP_WIDTH }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="shrink-0 border-l border-border/40 bg-card/20 text-sidebar-foreground flex flex-col overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {expanded ? (
          // ── Expanded ──────────────────────────────────────────────────────
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as SettingsTab)}
            className="flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="h-10 flex items-center gap-1.5 px-1.5 border-b border-border/40 shrink-0">
              <SidebarIconButton
                onClick={() => setExpanded(false)}
                tooltip="Collapse"
                tooltipSide="left"
              >
                <PanelRightClose className="size-4" />
              </SidebarIconButton>

              <TabsList className="flex-1 h-7">
                <TabsTrigger value="autolist" className="flex-1 text-xs gap-1 h-full">
                  <CalendarDays className="size-3" />
                  Posting
                </TabsTrigger>
                <TabsTrigger value="captions" className="flex-1 text-xs gap-1 h-full">
                  <Captions className="size-3" />
                  Captions
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Posting tab */}
            <TabsContent value="autolist" className="flex-1 overflow-y-auto mt-0 flex flex-col min-h-0">
              {/* AutoList section */}
              <div className="p-2">
                <Label className="px-2 pt-1 pb-1.5 block text-[10px] text-muted-foreground/40 uppercase tracking-wide">
                  Auto-publish
                </Label>
                {isLoading && (
                  <p className="px-2 py-3 text-xs text-muted-foreground/40">Loading…</p>
                )}
                {!isLoading && autolists.length === 0 && (
                  <p className="px-2 py-3 text-xs text-muted-foreground/40">No AutoLists found</p>
                )}
                {autolists.map((al) => {
                  const selected = autoListIds.includes(al.id);
                  return (
                    <button
                      key={al.id}
                      onClick={() => toggleAutoList(al.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-left transition-colors",
                        "hover:bg-sidebar-accent",
                        selected ? "text-sidebar-foreground" : "text-sidebar-foreground/60"
                      )}
                    >
                      <span
                        className={cn(
                          "w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center",
                          selected ? "bg-primary border-primary" : "border-sidebar-foreground/20"
                        )}
                      >
                        {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </span>
                      <span className="truncate">{al.name}</span>
                    </button>
                  );
                })}
              </div>

              <Separator className="mx-2 w-auto" />

              {/* Post description section */}
              <div className="p-2 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-2 pt-1">
                  <Label className="text-[10px] text-muted-foreground/40 uppercase tracking-wide flex-1">
                    Post Description
                  </Label>
                  {autoListIds.length === 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[9px] text-muted-foreground/25 cursor-default select-none">
                          Requires auto-list
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[180px] text-xs">
                        Description is used only for auto-publishing. Select an AutoList first.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Type toggle */}
                <div
                  className={cn(
                    "flex rounded-md overflow-hidden border border-border/50 bg-muted/20",
                    autoListIds.length === 0 && "opacity-40 pointer-events-none"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onPostDescriptionConfigChange({ ...postDescriptionConfig, type: "static" })
                    }
                    className={cn(
                      "flex-1 h-7 rounded-none text-[11px]",
                      (postDescriptionConfig?.type ?? "static") === "static"
                        ? "bg-primary/20 text-primary hover:bg-primary/25 hover:text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    Static
                  </Button>
                  <Separator orientation="vertical" className="h-7" />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="flex-1 h-7 rounded-none text-[11px] gap-1 text-muted-foreground/30 cursor-not-allowed"
                  >
                    Generated
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0 border-muted-foreground/20 text-muted-foreground/30">
                      Soon
                    </Badge>
                  </Button>
                </div>

                {/* Static description textarea */}
                <Textarea
                  disabled={autoListIds.length === 0}
                  value={postDescriptionConfig?.value ?? ""}
                  onChange={(e) =>
                    onPostDescriptionConfigChange({
                      type: postDescriptionConfig?.type ?? "static",
                      value: e.target.value || null,
                    })
                  }
                  placeholder="Enter post description…"
                  rows={4}
                  className={cn(
                    "text-xs resize-none min-h-0",
                    autoListIds.length === 0 && "opacity-40 cursor-not-allowed"
                  )}
                />
              </div>
            </TabsContent>

            {/* Captions tab */}
            <TabsContent value="captions" className="flex-1 flex flex-col overflow-hidden mt-0 min-h-0">
              {!captionsNode ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5 text-center">
                  <Captions className="w-7 h-7 text-muted-foreground/15" />
                  <p className="text-xs text-muted-foreground/40 leading-snug">
                    Add a{" "}
                    <span className="text-muted-foreground/60 font-medium">Video Editor</span>{" "}
                    node and enable{" "}
                    <span className="text-muted-foreground/60 font-medium">Add captions</span>.
                  </p>
                </div>
              ) : (
                <>
                  {/* Style grid */}
                  <div className="flex-1 overflow-y-auto p-3 min-h-0">
                    <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wide mb-2">
                      Style
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {CAPTION_STYLES.map((s) => (
                        <StyleCard
                          key={s.code}
                          style={s}
                          selected={styleCode === s.code}
                          onClick={() => handleStyleSelect(s.code)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-border/40 shrink-0" />

                  {/* Position picker */}
                  <div className="flex-1 min-h-0 p-3 flex flex-col gap-2">
                    <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wide">
                      Position
                    </p>
                    <PositionPicker
                      position={position}
                      onPositionChange={handlePositionChange}
                      styleCode={styleCode}
                    />
                    <p className="text-[9px] text-muted-foreground/25 text-center">
                      Click or drag to reposition
                    </p>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          // ── Collapsed — icon strip ─────────────────────────────────────────
          <div className="flex flex-col items-center py-1 gap-0.5">
            <SidebarIconButton
              onClick={() => setExpanded(true)}
              tooltip="Expand"
              tooltipSide="left"
            >
              <PanelRightOpen className="size-4" />
            </SidebarIconButton>

            <div className="w-5 h-px bg-border/40 my-0.5" />

            <SidebarIconButton
              onClick={() => openTab("autolist")}
              tooltip="Auto-publish"
              tooltipSide="left"
              active={autoListIds.length > 0}
            >
              <CalendarDays className="size-4" />
            </SidebarIconButton>

            <SidebarIconButton
              onClick={() => openTab("captions")}
              tooltip="Captions"
              tooltipSide="left"
              active={!!captionsNode}
            >
              <Captions className="size-4" />
            </SidebarIconButton>
          </div>
        )}
      </motion.aside>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// SidebarIconButton
// ---------------------------------------------------------------------------

function SidebarIconButton({ onClick, tooltip, tooltipSide = "left", active, children }: {
  onClick: () => void;
  tooltip: string;
  tooltipSide?: "left" | "right" | "top" | "bottom";
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-md shrink-0 transition-colors",
            "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground",
            active && "text-sidebar-foreground"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
