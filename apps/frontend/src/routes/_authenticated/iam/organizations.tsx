import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { OrganizationExplorer } from "@/features/iam/components/OrganizationExplorer";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/iam/organizations")({
  validateSearch: (search: Record<string, unknown>): { org?: string } => ({
    org: typeof search.org === "string" ? search.org : undefined,
  }),
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "organizations.read");
  },
  loader: async () => {
    await Apis.IAM.listOrganizations();
  },
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { org } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <OrganizationExplorer
      selectedOrganizationId={org}
      onSelectedOrganizationChange={(id) => {
        void navigate({ search: { org: id } });
      }}
    />
  );
}
