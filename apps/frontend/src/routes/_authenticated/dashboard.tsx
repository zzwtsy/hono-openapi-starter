import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

// 概览页:新用户(无业务权限)显示空状态提示,引导联系管理员授权;有权限显示占位(待实现)。
// permissions 来自 _authenticated beforeLoad 的 me.permissions(相对 home org 的有效权限全集)。
export function Dashboard() {
  const permissions = useRouteContext({ strict: false, select: c => c.auth?.permissions }) ?? [];
  if (permissions.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <PageHeader title="Dashboard" />
        <Empty>
          <EmptyMedia variant="icon"><ShieldOff /></EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>暂无可用功能</EmptyTitle>
            <EmptyDescription>你的账号尚未分配角色或权限,请联系管理员授权后再使用。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title="Dashboard" description="概览页待实现。" />
    </div>
  );
}
