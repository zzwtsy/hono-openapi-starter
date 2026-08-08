import type { UserSummary } from "@/api/globals";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { useState } from "react";
import Apis from "@/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AuditTimeline } from "@/features/audit/components/audit-timeline";
import { UserDetailPanel } from "@/features/iam/components/user-detail-panel";
import { UserForm } from "@/features/iam/components/user-form";
import { UserListPanel } from "@/features/iam/components/user-list";
import { useUserPageState } from "@/features/iam/hooks/use-user-page-state";
import { useUserSelection } from "@/features/iam/hooks/use-user-selection";
import { IAM_ACTIONS, refreshIam } from "@/features/iam/lib/iam-actions";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  const isNarrowScreen = useMediaQuery("(max-width: 1023px)");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const homeOrgId = auth.user?.orgId ?? "";
  const currentUserId = auth.user?.id ?? "";

  const canReadRoles = useCan("roles.read");
  const { data: roles } = useRequest(() => Apis.IAM.listRoles(), { immediate: canReadRoles });
  const { orgOptions, getOrgPath } = useUserPageState(homeOrgId);

  const { data: users } = useRequest(
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
    if (isNarrowScreen) {
      setDetailsOpen(true);
    }
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

  const detailPanel = selectedUser !== undefined
    ? (
        <UserDetailPanel
          key={selectedUser.id}
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
        <Card className="flex h-full items-center justify-center">
          <CardContent>
            <p className="text-sm text-muted-foreground">从左侧选择一个用户查看详情。</p>
          </CardContent>
        </Card>
      );

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 p-4 sm:p-6">
      <PageHeader title="用户管理" description="管理组织内的用户及其权限。" />
      <div className="grid min-h-0 flex-1 grid-rows-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <UserListPanel
          selectedUserId={selectedUserId}
          onSelect={handleSelect}
          onCreateUser={() => { setCreateOpen(true); }}
        />
        <div className="hidden min-h-0 min-w-0 lg:block">
          {detailPanel}
        </div>
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="overflow-y-auto data-[side=right]:w-full sm:data-[side=right]:max-w-2xl" side="right">
          <SheetHeader>
            <SheetTitle>用户详情</SheetTitle>
            <SheetDescription>查看并管理所选用户。</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {detailPanel}
          </div>
        </SheetContent>
      </Sheet>

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
    </div>
  );
}
