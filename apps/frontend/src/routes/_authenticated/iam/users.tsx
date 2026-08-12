import { createFileRoute, useNavigate } from "@tanstack/react-router";
import Apis from "@/api";
import { AuditTimeline } from "@/features/audit/components/audit-timeline";
import { UsersPage } from "@/features/iam/users-page";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/iam/users")({
  validateSearch: (search: Record<string, unknown>): { user?: string; org?: string; tab?: string } => ({
    user: typeof search.user === "string" ? search.user : undefined,
    org: typeof search.org === "string" ? search.org : undefined,
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissionCodes, "users.read");
  },
  loader: async () => {
    await Apis.IAM.listUsers();
  },
  component: UsersRouteComponent,
});

function UsersRouteComponent() {
  const { auth } = Route.useRouteContext();
  const { user, org, tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const routerNavigate = useNavigate();

  return (
    <UsersPage
      selectedUserId={user}
      orgId={org}
      tab={tab}
      homeOrgId={auth.user?.orgId ?? ""}
      currentUserId={auth.user?.id ?? ""}
      onSelectedUserChange={(userId) => { void navigate({ search: { user: userId } }); }}
      onOrgIdChange={(orgId) => { void navigate({ search: { user, org: orgId, tab } }); }}
      onTabChange={(nextTab) => { void navigate({ search: { user, org, tab: nextTab } }); }}
      onNavigateRole={(roleId, orgId) => { void routerNavigate({ to: "/iam/roles", search: { role: roleId, org: orgId } }); }}
      onTransferred={(orgId) => { void navigate({ search: { user, org: orgId, tab } }); }}
      renderAuditTimeline={userId => <AuditTimeline resourceType="user" resourceId={userId} />}
    />
  );
}
