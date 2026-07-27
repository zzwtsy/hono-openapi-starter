import { PageHeader } from "@/components/shared/page-header";
import { ProjectList } from "@/features/projects/ui/project-list";

export function ProjectsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title="项目" description="当前组织下的项目。" />
      <ProjectList />
    </div>
  );
}
