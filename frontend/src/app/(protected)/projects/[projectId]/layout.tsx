"use client";

import { usePathname } from "next/navigation";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

// Routes that use their own full-screen layout (no project sidebar)
const EDITOR_PATTERN = /\/(?:templates|library-templates)\/[^/]+$/;

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";

  if (EDITOR_PATTERN.test(pathname)) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
