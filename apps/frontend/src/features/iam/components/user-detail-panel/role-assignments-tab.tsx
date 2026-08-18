import type { UserAccessQueryState } from "../../hooks/use-user-access-data";
import type { Role, UserPermissionsResult, UserRoleAssignment } from "@/api/globals";
import { Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AsyncListState } from "@/components/shared/async-list";
import { DatePicker } from "@/components/shared/date-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ItemGroup } from "@/components/ui/item";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useRoleAssignments } from "../../hooks/use-role-assignments";
import { RoleAssignmentRow } from "./role-assignment-row";
import { RolePreviewCollapsible } from "./role-preview-collapsible";

interface RoleAssignmentsTabProps {
  userId: string;
  userName: string;
  userHomeOrgId: string;
  orgId: string;
  orgPath: string;
  roles: Role[];
  currentUserId: string;
  query: UserAccessQueryState<UserRoleAssignment[]>;
  effectiveResult?: UserPermissionsResult;
  onNavigateRole: (roleId: string, orgId?: string) => void;
}

export function RoleAssignmentsTab({ userId, userName, userHomeOrgId, orgId, orgPath, roles, currentUserId, query, effectiveResult, onNavigateRole }: RoleAssignmentsTabProps) {
  const {
    canGrant,
    canRevoke,
    selectedRoleId,
    setSelectedRoleId,
    expiresAt,
    setExpiresAt,
    editingRoleId,
    assigning,
    previewPerms,
    newPerms,
    roleItems,
    assignRole,
    startEdit,
    cancelEdit,
    revoke,
  } = useRoleAssignments({ userId, userHomeOrgId, orgId, roles, currentUserId, effectiveResult });
  const [dialogOpen, setDialogOpen] = useState(false);

  const closeDialog = () => {
    if (assigning)
      return;
    cancelEdit();
    setDialogOpen(false);
  };
  const submit = async () => {
    if (await assignRole())
      setDialogOpen(false);
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="role-assignments-title">
      <div className="flex items-center justify-between gap-3">
        <h3 id="role-assignments-title" className="text-sm font-semibold">角色授权</h3>
        {canGrant && (
          <Button type="button" size="sm" onClick={() => { setDialogOpen(true); }}>
            <Plus data-icon="inline-start" />
            授予角色
          </Button>
        )}
      </div>

      <AsyncListState loading={query.loading} error={query.error} data={query.data} onRetry={query.retry} loadingFallback={<Skeleton className="h-16 w-full" />} errorDescription="无法获取角色授权。">
        {query.data === undefined || query.data.length === 0
          ? (
              <Empty className="min-h-24 p-4">
                <EmptyMedia variant="icon"><ShieldCheck /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>暂无角色授权</EmptyTitle>
                  <EmptyDescription>该用户在当前组织没有角色授权。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          : (
              <ItemGroup>
                {query.data.map(assignment => (
                  <RoleAssignmentRow
                    key={assignment.roleId}
                    assignment={assignment}
                    canEdit={canGrant}
                    canRevoke={canRevoke}
                    busy={assigning}
                    onEdit={() => {
                      startEdit(assignment);
                      setDialogOpen(true);
                    }}
                    onRevoke={() => { void revoke(assignment.roleId); }}
                    onNavigateRole={onNavigateRole}
                  />
                ))}
              </ItemGroup>
            )}
      </AsyncListState>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open)
            closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton={!assigning}>
          <DialogHeader>
            <DialogTitle>{editingRoleId === null ? "授予角色" : "修改角色有效期"}</DialogTitle>
            <DialogDescription>
              {userName}
              {" · "}
              {orgPath}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="role-select">角色</FieldLabel>
              <Select items={roleItems} value={selectedRoleId === "" ? null : selectedRoleId} disabled={editingRoleId !== null || assigning} onValueChange={(value) => { setSelectedRoleId(value ?? ""); }}>
                <SelectTrigger id="role-select" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{roleItems.map(item => <SelectItem key={item.value ?? "none"} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            {editingRoleId === null && selectedRoleId !== "" && <RolePreviewCollapsible previewPerms={previewPerms} newPerms={newPerms} />}
            <Field>
              <FieldLabel htmlFor="role-expires">有效期</FieldLabel>
              <DatePicker id="role-expires" value={expiresAt} onChange={setExpiresAt} />
              <FieldDescription>留空表示永不过期；清除已有日期会恢复为永久。</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" disabled={assigning} onClick={closeDialog}>取消</Button>
            <Button disabled={selectedRoleId === "" || assigning} onClick={() => { void submit(); }}>
              {assigning && <Spinner data-icon="inline-start" />}
              {editingRoleId === null ? "授予角色" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
