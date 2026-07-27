import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { requirePermission } from "@/lib/require-permission";
import { ProjectsPage } from "@/pages/projects";

export const Route = createFileRoute("/_authenticated/projects/")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "projects.read");
  },
  loader: async () => {
    // 关键路由预取:写 alova cache,组件 useRequest 命中(cacheFor 在 api/index.ts 集中配置)
    await Apis.Projects.listProjects();
  },
  component: ProjectsPage,
});
