import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { RoleList } from "@/features/iam/components/RoleList";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/iam/roles")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "iam.read");
  },
  loader: async () => {
    // 关键路由预取:写 alova cache(cacheFor 60s),组件 useRequest 命中,避免二次请求与 back-nav 重拉
    await Apis.IAM.listRoles({ cacheFor: 60_000 });
  },
  component: () => (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-medium">角色管理</h1>
      <RoleList />
    </div>
  ),
});
