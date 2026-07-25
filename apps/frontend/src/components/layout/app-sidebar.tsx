import type { LucideIcon } from "lucide-react";
import type { FileRouteTypes } from "@/routeTree.gen";
import type { AppPermission } from "@/types/permissions";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { Building2, ChevronRight, ChevronsUpDown, Flame, FolderKanban, LayoutDashboard, LogOut, Settings, ShieldCheck, Users } from "lucide-react";
import { useMemo } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLogout } from "@/features/auth/hooks";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";

// 受保护区的侧边栏:导航按 permissions 显隐(前端 UX,后端 PermissionChecker 才是授权边界);
// 用户区显示登录态,登出走 useLogout(signOut + effect 监听 session 跳 /login)。
// 放 _authenticated layout 渲染(其 context 一定有 permissions/user)。

interface NavItemMeta {
  title: string;
  icon: LucideIcon;
  /** 显示该导航项所需的权限;省略则任何登录用户可见。 */
  permission?: AppPermission;
}

type NavItem = { to: FileRouteTypes["to"] } & NavItemMeta;

interface NavGroup {
  label: string;
  /** 可折叠组标题图标;单项组直接用子项图标,不需要组图标。 */
  icon?: LucideIcon;
  items: readonly NavItem[];
}

const navGroups: readonly NavGroup[] = [
  {
    label: "概览",
    items: [{ to: "/dashboard", title: "概览", icon: LayoutDashboard }],
  },
  {
    label: "访问控制",
    icon: ShieldCheck,
    items: [
      { to: "/iam/roles", title: "角色", icon: ShieldCheck, permission: "roles.read" },
      { to: "/iam/organizations", title: "组织", icon: Building2, permission: "organizations.read" },
      { to: "/iam/users", title: "用户", icon: Users, permission: "users.read" },
    ],
  },
  {
    label: "项目",
    items: [{ to: "/projects", title: "项目", icon: FolderKanban, permission: "projects.read" }],
  },
  {
    label: "系统",
    items: [{ to: "/settings", title: "系统设置", icon: Settings, permission: "settings.read" }],
  },
];

export function AppSidebar() {
  const auth = useAuth();
  const matchRoute = useMatchRoute();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";
  const { logout } = useLogout();

  const visibleGroups = useMemo(
    () => navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(
          item => item.permission === undefined || hasPermission(auth?.permissions, item.permission),
        ),
      }))
      .filter(group => group.items.length > 0),
    [auth?.permissions],
  );

  const name = auth?.user?.name ?? "";
  const email = auth?.user?.email ?? "";
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
          <SidebarMenu className="gap-1">
            {visibleGroups.map((group) => {
              // 单项组:直接渲染叶子按钮,避免标题与唯一子项重复
              if (group.items.length === 1) {
                const item = group.items[0];
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={matchRoute({ to: item.to, fuzzy: true }) !== false}
                      tooltip={item.title}
                      render={<Link to={item.to} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              const groupHasActive = group.items.some(
                item => matchRoute({ to: item.to, fuzzy: true }) !== false,
              );
              const GroupIcon = group.icon;

              // icon 折叠模式:官方 SidebarMenuSub 会被隐藏,用 DropdownMenu 让子项可达
              if (isCollapsed) {
                return (
                  <DropdownMenu key={group.label}>
                    <SidebarMenuItem>
                      <DropdownMenuTrigger render={<SidebarMenuButton tooltip={group.label} />}>
                        {GroupIcon && <GroupIcon />}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="min-w-40">
                        {group.items.map(item => (
                          <DropdownMenuItem
                            key={item.to}
                            render={<Link to={item.to} />}
                            className={matchRoute({ to: item.to, fuzzy: true }) !== false ? "bg-accent text-accent-foreground" : undefined}
                          >
                            {item.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </SidebarMenuItem>
                  </DropdownMenu>
                );
              }

              // 展开模式:官方 sidebar-07 nav-main 写法,Collapsible 直接渲染为 li(ul > li)
              return (
                <Collapsible
                  key={group.label}
                  defaultOpen={groupHasActive}
                  className="group/collapsible"
                  render={<SidebarMenuItem />}
                >
                  <CollapsibleTrigger render={<SidebarMenuButton tooltip={group.label} />}>
                    {GroupIcon && <GroupIcon />}
                    <span>{group.label}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {group.items.map(item => (
                        <SidebarMenuSubItem key={item.to}>
                          <SidebarMenuSubButton
                            isActive={matchRoute({ to: item.to, fuzzy: true }) !== false}
                            render={<Link to={item.to} />}
                          >
                            <span>{item.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
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
