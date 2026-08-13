import type { IamDetailMode } from "../iam-workbench";
import type { Role } from "@/api/globals";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCan } from "@/hooks/use-permissions";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { IAM_ACTIONS, refreshIam } from "../../lib/iam-actions";
import { IamDetailSurface } from "../iam-detail-surface";
import { RoleForm } from "../role-form";
import { RoleInfoTab } from "./role-info-tab";
import { RolePermissionsTab } from "./role-permissions-tab";
import { RoleUsersTab } from "./role-users-tab";

interface RoleDetailPanelProps {
  mode: IamDetailMode;
  role: Role;
  tab: string;
  onTabChange: (tab: string) => void;
  onNavigateUser: (userId: string, orgId: string) => void;
  getOrgPath: (orgId: string) => string;
  isSystemRootUser: boolean;
}

export function RoleDetailPanel({ mode, role, tab, onTabChange, onNavigateUser, getOrgPath, isSystemRootUser }: RoleDetailPanelProps) {
  const hasUpdatePermission = useCan("roles.update");
  const hasDeletePermission = useCan("roles.delete");
  const canUpdate = isSystemRootUser && hasUpdatePermission;
  const canDelete = isSystemRootUser && hasDeletePermission;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { mutate: runWithToast, busy: deletingBusy } = useToastMutation();

  const handleEditSuccess = () => {
    setEditing(false);
    refreshIam(IAM_ACTIONS.rolesList);
  };

  const confirmDelete = async () => {
    const ok = await runWithToast(
      () => Apis.IAM.deleteRole({ pathParams: { roleId: role.id } }),
      { successMessage: "角色已删除", errorMessage: "删除失败" },
    );
    if (ok) {
      setDeleting(false);
      refreshIam(IAM_ACTIONS.rolesList);
    }
  };

  return (
    <IamDetailSurface
      mode={mode}
      title={role.name}
      description={role.description ?? undefined}
      status={role.source === "code"
        ? (
            <Tooltip>
              <TooltipTrigger render={<Badge variant="secondary">代码</Badge>} />
              <TooltipContent>代码同步角色，不可修改或删除</TooltipContent>
            </Tooltip>
          )
        : <Badge variant="outline">实例</Badge>}
      actions={role.source === "instance" && (canUpdate || canDelete)
        ? (
            <div className="flex items-center gap-1">
              {canUpdate && (
                <Button variant="outline" size="sm" onClick={() => { setEditing(true); }}>
                  <Pencil data-icon="inline-start" />
                  编辑
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={() => { setDeleting(true); }}>
                  <Trash2 data-icon="inline-start" />
                  删除
                </Button>
              )}
            </div>
          )
        : undefined}
    >
      <Tabs value={tab} onValueChange={onTabChange} className="min-h-0 flex-1">
        <div className="shrink-0 overflow-x-auto pb-1">
          <TabsList variant="line" className="min-w-max justify-start">
            <TabsTrigger value="info">信息</TabsTrigger>
            <TabsTrigger value="permissions">权限分配</TabsTrigger>
            <TabsTrigger value="users">已授用户</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="info" className="min-h-0 flex-1 overflow-y-auto pt-3">
          <div className="max-w-3xl">
            <RoleInfoTab role={role} />
          </div>
        </TabsContent>
        <TabsContent value="permissions" className="min-h-0 flex-1 pt-3">
          <RolePermissionsTab key={role.id} role={role} isSystemRootUser={isSystemRootUser} />
        </TabsContent>
        <TabsContent value="users" className="min-h-0 flex-1 overflow-y-auto pt-3">
          <div className="max-w-4xl">
            <RoleUsersTab key={role.id} role={role} onNavigateUser={onNavigateUser} getOrgPath={getOrgPath} />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          {editing && <RoleForm key={role.id} role={role} onSuccess={handleEditSuccess} />}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleting}
        busy={deletingBusy}
        title="删除角色"
        description={`确认删除角色"${role.name}"?此操作不可撤销。`}
        onConfirm={() => { void confirmDelete(); }}
        onClose={() => setDeleting(false)}
      />
    </IamDetailSurface>
  );
}
