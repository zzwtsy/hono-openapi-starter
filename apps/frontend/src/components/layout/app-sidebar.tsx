import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { useMemo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { navGroups } from "./sidebar/nav-config";
import { NavMain } from "./sidebar/nav-main";
import { NavUser } from "./sidebar/nav-user";

// 受保护区的侧边栏:导航按 permissionCodes 显隐(前端 UX,后端 PermissionChecker 才是授权边界);
// 用户区显示登录态,登出由父层(_authenticated route wrapper)通过 onLogout 传入,
// 避免 components/layout 反向依赖 features/auth(boundaries:components 不依赖 features)。

export function AppSidebar({ onLogout }: { onLogout: () => void }) {
  const auth = useAuth();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";

  const visibleGroups = useMemo(
    () => navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(
          item => item.permission === undefined || hasPermission(auth?.permissionCodes, item.permission),
        ),
      }))
      .filter(group => group.items.length > 0),
    [auth?.permissionCodes],
  );

  const name = auth?.user?.name ?? "";
  const email = auth?.user?.email ?? "";

  return (
    <Sidebar variant="floating" collapsible="icon">
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
            <NavMain groups={visibleGroups} isCollapsed={isCollapsed} />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser name={name} email={email} onLogout={onLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}
