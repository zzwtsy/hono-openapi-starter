import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/projects/")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "projects.read");
  },
  loader: async () => {
    // 关键路由预取:写 alova cache(cacheFor 60s),组件 useRequest 命中,避免二次请求与 back-nav 重拉
    await Apis.Projects.listProjects({ cacheFor: 60_000 });
  },
  component: () => (
    <div className="p-6">
      <h1 className="font-medium">项目</h1>
      <ProjectList />
    </div>
  ),
});
