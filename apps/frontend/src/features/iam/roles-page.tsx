import type { Role } from "@/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { IamDetailSurface } from "./components/iam-detail-surface";
import { IamWorkbench } from "./components/iam-workbench";
import { RoleDetailPanel } from "./components/role-detail-panel";
import { RoleForm } from "./components/role-form";
import { RoleListPanel } from "./components/role-list";
import { useRoleSelection } from "./hooks/use-role-selection";
import { useUserPageState } from "./hooks/use-user-page-state";
import { IAM_ACTIONS, refreshIam } from "./lib/iam-actions";

interface RolesPageProps {
  selectedRoleId?: string;
  orgId?: string;
  tab?: string;
  onSelectedRoleChange: (roleId: string) => void;
  onTabChange: (tab: string) => void;
  onNavigateUser: (userId: string, orgId: string) => void;
  isSystemRootUser?: boolean;
}

export function RolesPage({
  selectedRoleId,
  orgId,
  tab,
  onSelectedRoleChange,
  onTabChange,
  onNavigateUser,
  isSystemRootUser = false,
}: RolesPageProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: roles, loading, error, send } = useRequest(
    () => Apis.IAM.listRoles(),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.rolesList) },
  );
  const { getOrgPath } = useUserPageState(orgId ?? "");
  const { selectedRole, activeTab } = useRoleSelection({ selectedRoleId, roles, tab });

  const handleSelect = (role: Role) => {
    onSelectedRoleChange(role.id);
    setDetailsOpen(true);
  };

  return (
    <>
      <IamWorkbench
        title="角色管理"
        description="管理实例角色及其权限。"
        actions={(
          <Can permission="roles.create" fallback={null}>
            {isSystemRootUser && (
              <Button onClick={() => { setCreateOpen(true); }}>
                <Plus data-icon="inline-start" />
                新建角色
              </Button>
            )}
          </Can>
        )}
        navigation={(
          <RoleListPanel
            selectedRoleId={selectedRole?.id}
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
                onTabChange={onTabChange}
                onNavigateUser={onNavigateUser}
                getOrgPath={getOrgPath}
                isSystemRootUser={isSystemRootUser}
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
