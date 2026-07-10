import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Apis from "@/api";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// 登录守卫 layout:无 session -> /login;有 -> getMe 取 permissions,下钻 context。
// 守卫不是授权边界,后端 PermissionChecker 才是(见 TanStack Router 认证文档)。
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    // session 在手,取 permissions;cacheFor 5min 命中 alova cache,避免跨受保护页面每路由重拉 /me
    const me = await Apis.Me.getMe({ cacheFor: 5 * 60_000 });
    return {
      auth: { ...context.auth, user: me.user, permissions: me.permissions },
    };
  },
  component: AuthenticatedLayout,
});

// 受保护区布局:Sidebar 导航 + Inset 内容。/login、/403 不在此 layout,不带 Sidebar。
function AuthenticatedLayout() {
  const { auth } = Route.useRouteContext();
  return (
    <SidebarProvider>
      <AppSidebar auth={auth} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
