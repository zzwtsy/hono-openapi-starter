import type { UserSummary } from "@/api/globals";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { AuditTimeline } from "@/features/audit/components/audit-timeline";
import { IamDetailSurface } from "@/features/iam/components/iam-detail-surface";
import { IamWorkbench } from "@/features/iam/components/iam-workbench";
import { UserDetailPanel } from "@/features/iam/components/user-detail-panel";
import { UserForm } from "@/features/iam/components/user-form";
import { UserListPanel } from "@/features/iam/components/user-list";
import { useUserPageState } from "@/features/iam/hooks/use-user-page-state";
import { useUserSelection } from "@/features/iam/hooks/use-user-selection";
import { IAM_ACTIONS, refreshIam } from "@/features/iam/lib/iam-actions";
import { useCan } from "@/hooks/use-permissions";
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
  component: UsersPage,
});

function UsersPage() {
  const { auth } = Route.useRouteContext();
  const { user: selectedUserId, org: orgParam, tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const routerNavigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const homeOrgId = auth.user?.orgId ?? "";
  const currentUserId = auth.user?.id ?? "";

  const canReadRoles = useCan("roles.read");
  const { data: roles } = useRequest(() => Apis.IAM.listRoles(), { immediate: canReadRoles });
  const { orgOptions, getOrgPath } = useUserPageState(homeOrgId);

  const { data: users, loading, error, send } = useRequest(
    () => Apis.IAM.listUsers(),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.usersList) },
  );
  const { selectedUser, orgId, activeTab } = useUserSelection({
    selectedUserId,
    users,
    orgParam,
    tab,
    homeOrgId,
  });

  const handleSelect = (user: UserSummary) => {
    void navigate({ search: { user: user.id } });
    setDetailsOpen(true);
  };

  const handleOrgIdChange = (newOrgId: string) => {
    void navigate({ search: { user: selectedUserId, org: newOrgId, tab } });
  };

  const handleTabChange = (newTab: string) => {
    void navigate({ search: { user: selectedUserId, org: orgParam, tab: newTab } });
  };

  const handleNavigateRole = (roleId: string, orgId?: string) => {
    void routerNavigate({ to: "/iam/roles", search: { role: roleId, org: orgId } });
  };

  const handleTransferred = (newOrgId: string) => {
    void navigate({ search: { user: selectedUserId, org: newOrgId, tab } });
  };

  return (
    <>
      <IamWorkbench
        title="用户管理"
        description="管理组织内的用户及其权限。"
        actions={(
          <Can permission="users.create">
            <Button onClick={() => { setCreateOpen(true); }}>
              <Plus data-icon="inline-start" />
              新建用户
            </Button>
          </Can>
        )}
        navigation={(
          <UserListPanel
            selectedUserId={selectedUserId}
            users={users}
            loading={loading}
            error={error}
            onRetry={() => { void send(); }}
            onSelect={handleSelect}
          />
        )}
        detailsOpen={detailsOpen}
        onDetailsOpenChange={setDetailsOpen}
        sheetTitle="用户详情"
        sheetDescription="查看并管理所选用户。"
        renderDetail={mode => selectedUser !== undefined
          ? (
              <UserDetailPanel
                key={selectedUser.id}
                mode={mode}
                user={selectedUser}
                orgId={orgId}
                onOrgIdChange={handleOrgIdChange}
                orgOptions={orgOptions}
                getOrgPath={getOrgPath}
                currentUserId={currentUserId}
                roles={roles ?? []}
                tab={activeTab}
                onTabChange={handleTabChange}
                onNavigateRole={handleNavigateRole}
                onTransferred={handleTransferred}
                auditTabContent={<AuditTimeline resourceType="user" resourceId={selectedUser.id} />}
              />
            )
          : (
              <IamDetailSurface mode={mode} title="用户详情">
                <Empty>
                  <EmptyMedia variant="icon"><Users /></EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>选择一个用户</EmptyTitle>
                    <EmptyDescription>从用户列表中选择后查看详情。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </IamDetailSurface>
            )}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          {createOpen && (
            <UserForm
              onSuccess={() => {
                setCreateOpen(false);
                refreshIam(IAM_ACTIONS.usersList);
              }}
              orgOptions={orgOptions}
              defaultOrgId={homeOrgId}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
