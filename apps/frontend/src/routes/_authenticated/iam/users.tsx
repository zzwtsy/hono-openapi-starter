import type { UserAccessView, UserDetailTab } from "@/features/iam/hooks/use-user-selection";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import Apis from "@/api";
import { AuditTimeline } from "@/features/audit/components/audit-timeline";
import { parseUserAccessView, parseUserDetailTab } from "@/features/iam/hooks/use-user-selection";
import { UsersPage } from "@/features/iam/users-page";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/iam/users")({
  validateSearch: (search: Record<string, unknown>): { user?: string; org?: string; tab?: UserDetailTab; accessView?: UserAccessView } => ({
    user: typeof search.user === "string" ? search.user : undefined,
    org: typeof search.org === "string" ? search.org : undefined,
    tab: parseUserDetailTab(search.tab),
    accessView: parseUserAccessView(search.accessView, search.tab),
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
  const { user, org, tab, accessView: accessViewParam } = Route.useSearch();
  const accessView = accessViewParam ?? "config";
  const navigate = Route.useNavigate();
  const routerNavigate = useNavigate();

  return (
    <UsersPage
      selectedUserId={user}
      orgId={org}
      tab={tab}
      accessView={accessView}
      homeOrgId={auth.user?.orgId ?? ""}
      currentUserId={auth.user?.id ?? ""}
      onSelectedUserChange={(userId) => { void navigate({ search: { user: userId } }); }}
      onOrgIdChange={(orgId) => { void navigate({ search: { user, org: orgId, tab, accessView } }); }}
      onTabChange={(nextTab) => { void navigate({ search: { user, org, tab: nextTab, accessView } }); }}
      onAccessViewChange={(nextAccessView) => { void navigate({ search: { user, org, tab, accessView: nextAccessView } }); }}
      onNavigateRole={(roleId, orgId) => { void routerNavigate({ to: "/iam/roles", search: { role: roleId, org: orgId } }); }}
      onTransferred={(orgId) => { void navigate({ search: { user, org: orgId, tab, accessView } }); }}
      renderAuditTimeline={userId => <AuditTimeline resourceType="user" resourceId={userId} />}
    />
  );
}
