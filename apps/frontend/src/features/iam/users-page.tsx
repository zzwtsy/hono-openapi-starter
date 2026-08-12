import type { ReactNode } from "react";
import type { UserSummary } from "@/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useCan } from "@/hooks/use-permissions";
import { IamDetailSurface } from "./components/iam-detail-surface";
import { IamWorkbench } from "./components/iam-workbench";
import { UserDetailPanel } from "./components/user-detail-panel";
import { UserForm } from "./components/user-form";
import { UserListPanel } from "./components/user-list";
import { useUserPageState } from "./hooks/use-user-page-state";
import { useUserSelection } from "./hooks/use-user-selection";
import { IAM_ACTIONS, refreshIam } from "./lib/iam-actions";

interface UsersPageProps {
  selectedUserId?: string;
  orgId?: string;
  tab?: string;
  homeOrgId: string;
  currentUserId: string;
  onSelectedUserChange: (userId: string) => void;
  onOrgIdChange: (orgId: string) => void;
  onTabChange: (tab: string) => void;
  onNavigateRole: (roleId: string, orgId?: string) => void;
  onTransferred: (orgId: string) => void;
  renderAuditTimeline: (userId: string) => ReactNode;
}

export function UsersPage({
  selectedUserId,
  orgId: orgParam,
  tab,
  homeOrgId,
  currentUserId,
  onSelectedUserChange,
  onOrgIdChange,
  onTabChange,
  onNavigateRole,
  onTransferred,
  renderAuditTimeline,
}: UsersPageProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

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
    onSelectedUserChange(user.id);
    setDetailsOpen(true);
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
                onOrgIdChange={onOrgIdChange}
                orgOptions={orgOptions}
                getOrgPath={getOrgPath}
                currentUserId={currentUserId}
                roles={roles ?? []}
                tab={activeTab}
                onTabChange={onTabChange}
                onNavigateRole={onNavigateRole}
                onTransferred={onTransferred}
                auditTabContent={renderAuditTimeline(selectedUser.id)}
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
