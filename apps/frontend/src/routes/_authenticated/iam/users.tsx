import type { UserSummary } from "@/api/globals";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import { UserDetailPanel } from "@/features/iam/components/user-detail-panel";
import { UserForm } from "@/features/iam/components/user-form";
import { UserListPanel } from "@/features/iam/components/user-list";
import { IAM_ACTIONS, refreshIam } from "@/features/iam/iam-actions";
import { buildOrganizationTree } from "@/features/iam/organization-tree";
import { useCan } from "@/hooks/use-permissions";
import { requirePermission } from "@/lib/require-permission";

const NARROW_SCREEN_QUERY = "(max-width: 1023px)";

function subscribeNarrowScreen(callback: () => void) {
  const query = window.matchMedia(NARROW_SCREEN_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function useIsNarrowScreen() {
  return useSyncExternalStore(
    subscribeNarrowScreen,
    () => window.matchMedia(NARROW_SCREEN_QUERY).matches,
    () => false,
  );
}

const TAB_VALUES = ["info", "roles", "direct", "effective"] as const;

export const Route = createFileRoute("/_authenticated/iam/users")({
  validateSearch: (search: Record<string, unknown>): { user?: string; org?: string; tab?: string } => ({
    user: typeof search.user === "string" ? search.user : undefined,
    org: typeof search.org === "string" ? search.org : undefined,
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "users.read");
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
  const isNarrowScreen = useIsNarrowScreen();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const homeOrgId = auth.user?.orgId ?? "";
  const currentUserId = auth.user?.id ?? "";

  const canReadRoles = useCan("roles.read");
  const canReadOrgs = useCan("organizations.read");
  const { data: roles } = useRequest(() => Apis.IAM.listRoles(), { immediate: canReadRoles });
  const { data: organizations } = useRequest(() => Apis.IAM.listOrganizations(), { immediate: canReadOrgs });

  const orgOptions = useMemo(() => {
    if (organizations == null) {
      return [{ label: homeOrgId, value: homeOrgId }];
    }
    const tree = buildOrganizationTree(organizations);
    return [
      { label: tree.getDisplayPath(homeOrgId), value: homeOrgId },
      ...[...tree.getDescendantIds(homeOrgId)].map(id => ({ label: tree.getDisplayPath(id), value: id })),
    ];
  }, [organizations, homeOrgId]);

  const getOrgPath = useMemo(() => {
    if (organizations == null) {
      return (id: string) => id;
    }
    const tree = buildOrganizationTree(organizations);
    return (id: string) => tree.getDisplayPath(id);
  }, [organizations]);

  const { data: users } = useRequest(
    () => Apis.IAM.listUsers(),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.usersList) },
  );
  const selectedUser = users?.find(u => u.id === selectedUserId);

  // 选中回退:未指定 user 时选首条(对齐组织管理 rootIds[0])
  useEffect(() => {
    if (selectedUserId === undefined && users != null && users.length > 0) {
      void navigate({ search: { user: users[0].id }, replace: true });
    }
  }, [selectedUserId, users, navigate]);

  const orgId = orgParam ?? selectedUser?.orgId ?? homeOrgId;
  const activeTab = tab !== undefined && (TAB_VALUES as readonly string[]).includes(tab) ? tab : "info";

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

  const handleNavigateRole = (roleId: string) => {
    void routerNavigate({ to: "/iam/roles", search: { role: roleId } });
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
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <PageHeader title="用户管理" description="管理组织内的用户及其权限。" />
      <div className="grid min-h-128 flex-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <UserListPanel
          selectedUserId={selectedUserId}
          onSelect={handleSelect}
          onCreateUser={() => { setCreateOpen(true); }}
        />
        <div className="hidden min-w-0 lg:block">
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
