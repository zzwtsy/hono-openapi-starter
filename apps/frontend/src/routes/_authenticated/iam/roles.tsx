import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { RoleList } from "@/features/iam/components/RoleList";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/iam/roles")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "iam.read");
  },
  loader: async () => {
    // 关键路由预取:写 alova cache,组件 useRequest 命中(cacheFor 在 api/index.ts 集中配置)
    await Apis.IAM.listRoles();
  },
  component: RolesPage,
});

function RolesPage() {
  const { auth } = Route.useRouteContext();
  // 读需要 iam.read(见 beforeLoad);写操作(新建/编辑/删除)额外要 iam.manage
  const canManage = auth.permissions?.includes("iam.manage") === true;
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-medium">角色管理</h1>
      <RoleList canManage={canManage} />
    </div>
  );
}
