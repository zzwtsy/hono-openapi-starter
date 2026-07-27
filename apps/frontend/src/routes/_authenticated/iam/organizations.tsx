import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { OrganizationsPage } from "@/features/iam/organizations-page";
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
  component: OrganizationsRouteComponent,
});

function OrganizationsRouteComponent() {
  const { org } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <OrganizationsPage
      selectedOrganizationId={org}
      onSelectedOrganizationChange={(id) => { void navigate({ search: { org: id } }); }}
    />
  );
}
