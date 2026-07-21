import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { PageHeader } from "@/components/ui/page-header";
import { RoleList } from "@/features/iam/components/RoleList";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/iam/roles")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "roles.read");
  },
  loader: async () => {
    // 关键路由预取:写 alova cache,组件 useRequest 命中(cacheFor 在 api/index.ts 集中配置)
    await Apis.IAM.listRoles();
  },
  component: RolesPage,
});

function RolesPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title="角色管理" description="管理实例角色及其描述。" />
      <RoleList />
    </div>
  );
}
