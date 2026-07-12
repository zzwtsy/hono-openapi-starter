import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { PageHeader } from "@/components/layout/page-header";
import { OrganizationList } from "@/features/iam/components/OrganizationList";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/iam/organizations")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "iam.read");
  },
  loader: async () => {
    await Apis.IAM.listOrganizations();
  },
  component: OrganizationsPage,
});

function OrganizationsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title="组织管理" description="管理组织树结构。" />
      <OrganizationList />
    </div>
  );
}
