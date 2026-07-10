import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { RoleList } from "@/features/iam/components/RoleList";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/iam/roles")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "iam.read");
  },
  loader: async () => {
    // 关键路由预取:写 alova cache,组件 useRequest 命中,避免二次请求
    await Apis.IAM.listRoles();
  },
  component: () => (
    <div className="p-6">
      <h1 className="font-medium">角色管理</h1>
      <RoleList />
    </div>
  ),
});
