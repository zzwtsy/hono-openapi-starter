import type { Role } from "@/api/globals";
import { useState } from "react";
import Apis from "@/api";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCan } from "@/hooks/use-permissions";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { IAM_ACTIONS, refreshIam } from "../../model/iam-actions";
import { RoleForm } from "../role-form";
import { RoleInfoTab } from "./role-info-tab";
import { RolePermissionsTab } from "./role-permissions-tab";
import { RoleUsersTab } from "./role-users-tab";

interface RoleDetailPanelProps {
  role: Role;
  tab: string;
  onTabChange: (tab: string) => void;
  onNavigateUser: (userId: string) => void;
  getOrgPath: (orgId: string) => string;
}

export function RoleDetailPanel({ role, tab, onTabChange, onNavigateUser, getOrgPath }: RoleDetailPanelProps) {
  const canUpdate = useCan("roles.update");
  const canDelete = useCan("roles.delete");
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
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full min-h-0 flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-medium">{role.name}</span>
            {role.description !== null && (
              <span className="text-sm text-muted-foreground">{role.description}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {role.source === "code"
              ? (
                  <Tooltip>
                    <TooltipTrigger render={<Badge variant="secondary">代码</Badge>} />
                    <TooltipContent>代码同步角色，不可修改或删除</TooltipContent>
                  </Tooltip>
                )
              : <Badge>实例</Badge>}
          </div>
        </div>

        <Tabs value={tab} onValueChange={onTabChange} className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="info">信息</TabsTrigger>
            <TabsTrigger value="permissions">权限分配</TabsTrigger>
            <TabsTrigger value="users">已授用户</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="min-h-0 flex-1 overflow-y-auto">
            <RoleInfoTab
              role={role}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={() => { setEditing(true); }}
              onDelete={() => { setDeleting(true); }}
            />
          </TabsContent>
          <TabsContent value="permissions" className="min-h-0 flex-1 overflow-y-auto">
            <RolePermissionsTab key={role.id} role={role} />
          </TabsContent>
          <TabsContent value="users" className="min-h-0 flex-1 overflow-y-auto">
            <RoleUsersTab key={role.id} role={role} onNavigateUser={onNavigateUser} getOrgPath={getOrgPath} />
          </TabsContent>
        </Tabs>
      </CardContent>

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
    </Card>
  );
}
