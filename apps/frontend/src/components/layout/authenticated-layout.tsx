import { Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

// 受保护区布局:Sidebar 导航 + Inset 内容。/login、/403 不在此 layout,不带 Sidebar。
// onLogout 由 _authenticated route wrapper 取(useLogout,route->features 允许),
// 传入避免 components/layout 反向依赖 features/auth(boundaries:components 不依赖 features)。
export function AuthenticatedLayout({ onLogout }: { onLogout: () => void }) {
  return (
    <SidebarProvider>
      <AppSidebar onLogout={onLogout} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
