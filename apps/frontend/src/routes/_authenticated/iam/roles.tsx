import { createFileRoute, useNavigate } from "@tanstack/react-router";
import Apis from "@/api";
import { RolesPage } from "@/features/iam/roles-page";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/iam/roles")({
  validateSearch: (search: Record<string, unknown>): { role?: string; org?: string; tab?: string } => ({
    role: typeof search.role === "string" ? search.role : undefined,
    org: typeof search.org === "string" ? search.org : undefined,
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissionCodes, "roles.read");
  },
  loader: async () => {
    await Apis.IAM.listRoles();
  },
  component: RolesRouteComponent,
});

function RolesRouteComponent() {
  const { auth } = Route.useRouteContext();
  const { role, org, tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const routerNavigate = useNavigate();

  return (
    <RolesPage
      selectedRoleId={role}
      orgId={org}
      tab={tab}
      onSelectedRoleChange={(roleId) => { void navigate({ search: { role: roleId } }); }}
      onTabChange={(nextTab) => { void navigate({ search: { role, org, tab: nextTab } }); }}
      onNavigateUser={(userId, orgId) => { void routerNavigate({ to: "/iam/users", search: { user: userId, org: orgId, tab: "roles" } }); }}
      isSystemRootUser={auth.isSystemRootUser === true}
    />
  );
}
