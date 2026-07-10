import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/projects/")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "projects.read");
  },
  loader: async () => {
    await Apis.Projects.listProjects();
  },
  component: () => (
    <div className="p-6">
      <h1 className="font-medium">项目</h1>
      <ProjectList />
    </div>
  ),
});
