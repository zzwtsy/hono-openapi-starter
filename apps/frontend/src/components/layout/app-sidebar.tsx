import type { LucideIcon } from "lucide-react";
import type { Me } from "@/api/globals";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronsUpDown, Flame, FolderKanban, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useLogout } from "@/features/auth/hooks";

// 受保护区的侧边栏:导航按 permissions 显隐(前端 UX,后端 PermissionChecker 才是授权边界);
// 用户区显示登录态,登出走 useLogout(signOut + effect 监听 session 跳 /login)。
// 放 _authenticated layout 渲染(其 context 一定有 permissions/user)。

interface NavItem {
  to: string;
  title: string;
  icon: LucideIcon;
  permission?: string;
  match: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  { to: "/dashboard", title: "概览", icon: LayoutDashboard, match: p => p === "/dashboard" },
  { to: "/iam/roles", title: "角色", icon: ShieldCheck, permission: "iam.read", match: p => p.startsWith("/iam") },
  { to: "/projects", title: "项目", icon: FolderKanban, permission: "projects.read", match: p => p.startsWith("/projects") },
];

interface AppSidebarProps {
  auth: { user?: Me["user"]; permissions?: string[] };
}

export function AppSidebar({ auth }: AppSidebarProps) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { logout } = useLogout();

  const visible = navItems.filter(
    item => item.permission === undefined || auth.permissions?.includes(item.permission) === true,
  );
  const name = auth.user?.name ?? "";
  const email = auth.user?.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Hono Starter" render={<Link to="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flame />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Hono Starter</span>
                <span className="truncate text-xs text-muted-foreground">控制台</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visible.map(item => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={item.match(pathname)}
                    tooltip={item.title}
                    render={<Link to={item.to} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                <Avatar>
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-56" side="top" align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { void logout(); }}>
                    <LogOut />
                    登出
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
