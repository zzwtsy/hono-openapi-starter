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
  orgId: string;
  roles: Role[];
  currentUserId: string;
  onNavigateRole: (roleId: string, orgId?: string) => void;
}

export function RoleAssignmentsTab({
  userId,
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
    assigning,
    previewPerms,
    newPerms,
    roleItems,
    assignRole,
    revoke,
  } = useRoleAssignments({ userId, orgId, roles, currentUserId });

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
                      canRevoke={canRevoke}
                      busy={assigning}
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
            <h4 className="text-sm font-medium">授予角色</h4>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="role-select">选择角色</FieldLabel>
                <Select
                  items={roleItems}
                  value={selectedRoleId === "" ? null : selectedRoleId}
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
                <FieldDescription>留空=永不过期(新授)/保留原值(续期)；暂不支持从有限期改回永不过期。</FieldDescription>
              </Field>
            </FieldGroup>
            <div className="flex justify-end">
              <Button disabled={selectedRoleId === "" || assigning} onClick={() => { void assignRole(); }}>
                {assigning && <Spinner data-icon="inline-start" />}
                <ShieldCheck data-icon="inline-start" />
                授予
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
