import type { Role } from "@/api/globals";
import { ShieldCheck } from "lucide-react";
import { AsyncListState } from "@/components/shared/async-list";
import { DatePicker } from "@/components/shared/date-picker";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ItemGroup } from "@/components/ui/item";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useRoleAssignments } from "../../hooks/use-role-assignments";
import { RoleAssignmentRow } from "./role-assignment-row";
import { RolePreviewCollapsible } from "./role-preview-collapsible";

interface RoleAssignmentsTabProps {
  userId: string;
  userHomeOrgId: string;
  orgId: string;
  roles: Role[];
  currentUserId: string;
  onNavigateRole: (roleId: string, orgId?: string) => void;
}

export function RoleAssignmentsTab({
  userId,
  userHomeOrgId,
  orgId,
  roles,
  currentUserId,
  onNavigateRole,
}: RoleAssignmentsTabProps) {
  const {
    canGrant,
    canRevoke,
    assignments,
    loading,
    error,
    send,
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
  } = useRoleAssignments({ userId, userHomeOrgId, orgId, roles, currentUserId });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">已授角色</h4>
        <AsyncListState
          loading={loading}
          error={error}
          data={assignments}
          onRetry={() => { void send(); }}
          loadingFallback={<Skeleton className="h-16 w-full" />}
          errorDescription="无法获取已授角色。"
        >
          {assignments === undefined || assignments.length === 0
            ? (
                <Empty className="min-h-28 p-4">
                  <EmptyMedia variant="icon"><ShieldCheck /></EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>暂无已授角色</EmptyTitle>
                    <EmptyDescription>该用户在当前组织没有角色授权。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            : (
                <ItemGroup>
                  {assignments.map(a => (
                    <RoleAssignmentRow
                      key={a.roleId}
                      assignment={a}
                      canEdit={canGrant}
                      canRevoke={canRevoke}
                      busy={assigning}
                      onEdit={() => { startEdit(a); }}
                      onRevoke={() => { void revoke(a.roleId); }}
                      onNavigateRole={onNavigateRole}
                    />
                  ))}
                </ItemGroup>
              )}
        </AsyncListState>
      </div>

      {canGrant && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">{editingRoleId === null ? "授予角色" : "编辑角色授权"}</h4>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="role-select">选择角色</FieldLabel>
                <Select
                  items={roleItems}
                  value={selectedRoleId === "" ? null : selectedRoleId}
                  disabled={editingRoleId !== null}
                  onValueChange={(val) => {
                    setSelectedRoleId(val ?? "");
                  }}
                >
                  <SelectTrigger id="role-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {roleItems.map(item => (
                        <SelectItem key={item.value ?? "none"} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {selectedRoleId !== "" && (
                <RolePreviewCollapsible previewPerms={previewPerms} newPerms={newPerms} />
              )}
              <Field>
                <FieldLabel htmlFor="role-expires">过期时间(可选)</FieldLabel>
                <DatePicker id="role-expires" value={expiresAt} onChange={setExpiresAt} />
                <FieldDescription>留空表示永不过期；编辑已有授权时可清除日期恢复永久。</FieldDescription>
              </Field>
            </FieldGroup>
            <div className="flex justify-end gap-2">
              {editingRoleId !== null && (
                <Button variant="outline" disabled={assigning} onClick={cancelEdit}>
                  取消
                </Button>
              )}
              <Button disabled={selectedRoleId === "" || assigning} onClick={() => { void assignRole(); }}>
                {assigning && <Spinner data-icon="inline-start" />}
                <ShieldCheck data-icon="inline-start" />
                {editingRoleId === null ? "授予" : "保存"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
