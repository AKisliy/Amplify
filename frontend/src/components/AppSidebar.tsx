"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import {
  LayoutTemplate,
  User,
  Calendar,
  Link as LinkIcon,
  Images,
  Tag,
  FolderKanban,
  ChevronsUpDown,
  Check,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { useAuth } from "@/features/auth/hooks/useAuth";

const NAV_ITEMS = [
  {
    label: "Overview",
    href: (id: string) => `/projects/${id}`,
    icon: LayoutTemplate,
    exact: true,
  },
  {
    label: "Ambassador",
    href: (id: string) => `/projects/${id}/ambassadors`,
    icon: User,
    exact: false,
  },
  {
    label: "Products",
    href: (id: string) => `/projects/${id}/products`,
    icon: Tag,
    exact: false,
  },
  {
    label: "Autolists",
    href: (id: string) => `/projects/${id}/autolists`,
    icon: Calendar,
    exact: false,
  },
  {
    label: "Connections",
    href: (id: string) => `/projects/${id}/integrations`,
    icon: LinkIcon,
    exact: false,
  },
  {
    label: "Assets",
    href: (id: string) => `/projects/${id}/assets`,
    icon: Images,
    exact: false,
  },
];

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  const { projects, isLoading } = useProjects();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const currentProject = projects.find((p) => p.id === projectId);
  const displayName = user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                    <FolderKanban className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none min-w-0">
                    <span className="font-semibold truncate">
                      {isLoading ? "Loading…" : (currentProject?.name ?? "Select Project")}
                    </span>
                    <span className="text-xs text-muted-foreground">Project</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{project.name}</span>
                    {project.id === projectId && <Check className="size-4 shrink-0 ml-2" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
                if (!projectId) return null;
                const url = href(projectId);
                const isActive = exact
                  ? pathname === url
                  : pathname?.startsWith(url) ?? false;
                return (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => router.push(url)}
                      tooltip={label}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none min-w-0">
                    <span className="font-medium truncate">{displayName}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    {theme === "dark" ? (
                      <Moon className="mr-2 h-4 w-4" />
                    ) : theme === "light" ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Monitor className="mr-2 h-4 w-4" />
                    )}
                    Theme
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                      <Sun className="mr-2 h-4 w-4" /> Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                      <Moon className="mr-2 h-4 w-4" /> Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                      <Monitor className="mr-2 h-4 w-4" /> System
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
