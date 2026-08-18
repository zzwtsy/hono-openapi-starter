import { createFileRoute, useBlocker, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import Apis from "@/api";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [permissionsDirty, setPermissionsDirty] = useState(false);
  const blocker = useBlocker({
    shouldBlockFn: () => permissionsDirty,
    enableBeforeUnload: permissionsDirty,
    disabled: !permissionsDirty,
    withResolver: true,
  });

  return (
    <>
      <RolesPage
        selectedRoleId={role}
        orgId={org}
        tab={tab}
        onSelectedRoleChange={(roleId) => { void navigate({ search: { role: roleId } }); }}
        onTabChange={(nextTab) => { void navigate({ search: { role, org, tab: nextTab } }); }}
        onNavigateUser={(userId, orgId) => { void routerNavigate({ to: "/iam/users", search: { user: userId, org: orgId, tab: "access" } }); }}
        isSystemRootUser={auth.isSystemRootUser === true}
        onPermissionsDirtyChange={setPermissionsDirty}
      />
      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.status === "blocked") {
            blocker.reset();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃未保存的权限更改？</AlertDialogTitle>
            <AlertDialogDescription>离开角色管理后，当前权限草稿将被清除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.status === "blocked" && blocker.reset()}>继续编辑</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setPermissionsDirty(false);
                if (blocker.status === "blocked") {
                  blocker.proceed();
                }
              }}
            >
              放弃并离开
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
