import type { Role } from "@/api/globals";
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
import { RoleDetailPanel } from "@/features/iam/components/role-detail-panel";
import { RoleForm } from "@/features/iam/components/role-form";
import { RoleListPanel } from "@/features/iam/components/role-list";
import { useRoleSelection } from "@/features/iam/hooks/use-role-selection";
import { useUserPageState } from "@/features/iam/hooks/use-user-page-state";
import { IAM_ACTIONS, refreshIam } from "@/features/iam/lib/iam-actions";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  const isNarrowScreen = useMediaQuery("(max-width: 1023px)");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: roles } = useRequest(
    () => Apis.IAM.listRoles(),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.rolesList) },
  );
  const { getOrgPath } = useUserPageState(orgParam ?? "");
  const { selectedRole, activeTab } = useRoleSelection({ selectedRoleId, roles, tab });

  const handleSelect = (role: Role) => {
    void navigate({ search: { role: role.id } });
    if (isNarrowScreen) {
      setDetailsOpen(true);
    }
  };

  const handleTabChange = (newTab: string) => {
    void navigate({ search: { role: selectedRoleId, org: orgParam, tab: newTab } });
  };

  const handleNavigateUser = (userId: string, orgId: string) => {
    void routerNavigate({ to: "/iam/users", search: { user: userId, org: orgId, tab: "roles" } });
  };

  const detailPanel = selectedRole !== undefined
    ? (
        <RoleDetailPanel
          key={selectedRole.id}
          role={selectedRole}
          tab={activeTab}
          onTabChange={handleTabChange}
          onNavigateUser={handleNavigateUser}
          getOrgPath={getOrgPath}
        />
      )
    : (
        <Card className="flex h-full items-center justify-center">
          <CardContent>
            <p className="text-sm text-muted-foreground">从左侧选择一个角色查看详情。</p>
          </CardContent>
        </Card>
      );

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 p-4 sm:p-6">
      <PageHeader title="角色管理" description="管理实例角色及其权限。" />
      <div className="grid min-h-0 flex-1 grid-rows-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <RoleListPanel
          selectedRoleId={selectedRoleId}
          onSelect={handleSelect}
          onCreateRole={() => { setCreateOpen(true); }}
        />
        <div className="hidden min-h-0 min-w-0 lg:block">
          {detailPanel}
        </div>
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="overflow-y-auto data-[side=right]:w-full sm:data-[side=right]:max-w-2xl" side="right">
          <SheetHeader>
            <SheetTitle>角色详情</SheetTitle>
            <SheetDescription>查看并管理所选角色。</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {detailPanel}
          </div>
        </SheetContent>
      </Sheet>

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
    </div>
  );
}
