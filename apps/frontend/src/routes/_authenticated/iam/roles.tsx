import type { Role } from "@/api/globals";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { IamDetailSurface } from "@/features/iam/components/iam-detail-surface";
import { IamWorkbench } from "@/features/iam/components/iam-workbench";
import { RoleDetailPanel } from "@/features/iam/components/role-detail-panel";
import { RoleForm } from "@/features/iam/components/role-form";
import { RoleListPanel } from "@/features/iam/components/role-list";
import { useRoleSelection } from "@/features/iam/hooks/use-role-selection";
import { useUserPageState } from "@/features/iam/hooks/use-user-page-state";
import { IAM_ACTIONS, refreshIam } from "@/features/iam/lib/iam-actions";
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
  component: RolesPage,
});

function RolesPage() {
  const { role: selectedRoleId, org: orgParam, tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const routerNavigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: roles, loading, error, send } = useRequest(
    () => Apis.IAM.listRoles(),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.rolesList) },
  );
  const { getOrgPath } = useUserPageState(orgParam ?? "");
  const { selectedRole, activeTab } = useRoleSelection({ selectedRoleId, roles, tab });

  const handleSelect = (role: Role) => {
    void navigate({ search: { role: role.id } });
    setDetailsOpen(true);
  };

  const handleTabChange = (newTab: string) => {
    void navigate({ search: { role: selectedRoleId, org: orgParam, tab: newTab } });
  };

  const handleNavigateUser = (userId: string, orgId: string) => {
    void routerNavigate({ to: "/iam/users", search: { user: userId, org: orgId, tab: "roles" } });
  };

  return (
    <>
      <IamWorkbench
        title="角色管理"
        description="管理实例角色及其权限。"
        actions={(
          <Can permission="roles.create">
            <Button onClick={() => { setCreateOpen(true); }}>
              <Plus data-icon="inline-start" />
              新建角色
            </Button>
          </Can>
        )}
        navigation={(
          <RoleListPanel
            selectedRoleId={selectedRoleId}
            roles={roles}
            loading={loading}
            error={error}
            onRetry={() => { void send(); }}
            onSelect={handleSelect}
          />
        )}
        detailsOpen={detailsOpen}
        onDetailsOpenChange={setDetailsOpen}
        sheetTitle="角色详情"
        sheetDescription="查看并管理所选角色。"
        renderDetail={mode => selectedRole !== undefined
          ? (
              <RoleDetailPanel
                key={selectedRole.id}
                mode={mode}
                role={selectedRole}
                tab={activeTab}
                onTabChange={handleTabChange}
                onNavigateUser={handleNavigateUser}
                getOrgPath={getOrgPath}
              />
            )
          : (
              <IamDetailSurface mode={mode} title="角色详情">
                <Empty>
                  <EmptyMedia variant="icon"><ShieldCheck /></EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>选择一个角色</EmptyTitle>
                    <EmptyDescription>从角色列表中选择后查看详情。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </IamDetailSurface>
            )}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          {createOpen && (
            <RoleForm
              onSuccess={() => {
                setCreateOpen(false);
                refreshIam(IAM_ACTIONS.rolesList);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
