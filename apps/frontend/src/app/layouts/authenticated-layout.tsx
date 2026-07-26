import { Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

// 受保护区布局:Sidebar 导航 + Inset 内容。/login、/403 不在此 layout,不带 Sidebar。
export function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
