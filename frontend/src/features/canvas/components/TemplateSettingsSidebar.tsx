"use client";

import { Check, CalendarDays, PanelRightClose, PanelRightOpen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAutolists } from "@/features/autolists/hooks/useAutolists";

// ---------------------------------------------------------------------------
// Trigger button — uses useSidebar() so must be inside SidebarProvider
// ---------------------------------------------------------------------------

function SidebarToggleButton() {
  const { state, toggleSidebar } = useSidebar();
  const isExpanded = state === "expanded";
  return (
    <SidebarMenuButton
      onClick={toggleSidebar}
      tooltip={isExpanded ? "Collapse" : "Expand"}
      className="w-8 h-8"
    >
      {isExpanded
        ? <PanelRightClose className="size-4" />
        : <PanelRightOpen className="size-4" />
      }
      <span className="sr-only">{isExpanded ? "Collapse" : "Expand"} sidebar</span>
    </SidebarMenuButton>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TemplateSettingsSidebarProps {
  projectId: string;
  autoListIds: string[];
  onAutoListIdsChange: (ids: string[]) => void;
}

export function TemplateSettingsSidebar({
  projectId,
  autoListIds,
  onAutoListIdsChange,
}: TemplateSettingsSidebarProps) {
  const { autolists, isLoading } = useAutolists(projectId);

  const toggle = (id: string) => {
    const next = autoListIds.includes(id)
      ? autoListIds.filter((x) => x !== id)
      : [...autoListIds, id];
    onAutoListIdsChange(next);
  };

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarToggleButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Auto-publish</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Auto-publish" isActive={autoListIds.length > 0}>
                <CalendarDays className="size-4" />
                <span>Auto-publish</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarGroupContent className="group-data-[collapsible=icon]:hidden mt-1">
            {isLoading && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground/50">Loading…</p>
            )}
            {!isLoading && autolists.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground/50">No AutoLists found</p>
            )}
            {autolists.map((al) => {
              const selected = autoListIds.includes(al.id);
              return (
                <button
                  key={al.id}
                  onClick={() => toggle(al.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-left transition-colors",
                    "hover:bg-sidebar-accent",
                    selected ? "text-sidebar-foreground" : "text-sidebar-foreground/60"
                  )}
                >
                  <span
                    className={cn(
                      "w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center",
                      selected
                        ? "bg-primary border-primary"
                        : "border-sidebar-foreground/20"
                    )}
                  >
                    {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </span>
                  <span className="truncate">{al.name}</span>
                </button>
              );
            })}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
