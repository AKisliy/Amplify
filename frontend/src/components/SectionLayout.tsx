"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// SectionContainer — shared full-width section wrapper
// ---------------------------------------------------------------------------

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
}

export function SectionContainer({ children, className }: SectionContainerProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader — title + subtitle + optional action
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div>
        <h2 className="text-2xl font-semibold leading-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionGrid — normalised responsive card grid
// ---------------------------------------------------------------------------

interface SectionGridProps {
  children: ReactNode;
  className?: string;
}

export function SectionGrid({ children, className }: SectionGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionEmptyState — shared dashed-border empty placeholder
// ---------------------------------------------------------------------------

interface SectionEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function SectionEmptyState({ icon, title, description, className }: SectionEmptyStateProps) {
  return (
    <div
      className={cn(
        "border border-dashed rounded-lg",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-center text-sm max-w-xs">
          {description}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionSkeletonGrid — shared loading skeleton grid
// ---------------------------------------------------------------------------

interface SectionSkeletonGridProps {
  count?: number;
}

export function SectionSkeletonGrid({ count = 4 }: SectionSkeletonGridProps) {
  return (
    <SectionGrid>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border/50 rounded-lg h-full animate-pulse overflow-hidden">
          <div className="w-full aspect-video bg-muted/60" />
          <div className="pt-3 pb-2 px-4 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        </div>
      ))}
    </SectionGrid>
  );
}
