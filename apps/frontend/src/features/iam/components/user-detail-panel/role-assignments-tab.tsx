import type { Role } from "@/api/globals";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { AsyncListState } from "@/components/shared/async-list";
import { DatePicker } from "@/components/shared/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useRoleAssignments } from "../../hooks/use-role-assignments";
import { RoleAssignmentRow } from "./role-assignment-row";

interface RoleAssignmentsTabProps {
  userId: string;
  orgId: string;
  roles: Role[];
  onNavigateRole: (roleId: string) => void;
}

export function RoleAssignmentsTab({
  userId,
  orgId,
  roles,
  onNavigateRole,
}: RoleAssignmentsTabProps) {
  const {
    canGrant,
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
  } = useRoleAssignments({ userId, orgId, roles });

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
            ? <p className="text-sm text-muted-foreground">暂无已授角色。</p>
            : (
                <div className="flex flex-col gap-2">
                  {assignments.map(a => (
                    <RoleAssignmentRow key={a.roleId} assignment={a} onRevoke={() => { void revoke(a.roleId); }} onNavigateRole={onNavigateRole} />
                  ))}
                </div>
              )}
        </AsyncListState>
      </div>

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
            <Collapsible className="group/collapsible">
              <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="w-full justify-start" />}>
                <ChevronRight className="size-4 transition-transform group-data-open/collapsible:rotate-90" />
                <span>
                  该角色含
                  {" "}
                  {previewPerms?.length ?? 0}
                  {" "}
                  项权限
                  {newPerms !== undefined && newPerms.length > 0 && ` · 授予后新增 ${newPerms.length} 项`}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-1 rounded-lg border p-2">
                  {previewPerms === undefined || previewPerms.length === 0
                    ? <span className="text-sm text-muted-foreground">该角色暂无权限</span>
                    : previewPerms.map(p => (
                        <Badge
                          key={p}
                          variant={(newPerms?.includes(p) ?? false) ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {p}
                        </Badge>
                      ))}
                </div>
                {newPerms !== undefined && newPerms.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">高亮为用户当前未持有的新增权限。</p>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
          <Field>
            <FieldLabel htmlFor="role-expires">过期时间(可选)</FieldLabel>
            <DatePicker id="role-expires" value={expiresAt} onChange={setExpiresAt} />
            <p className="text-xs text-muted-foreground">留空=永不过期(新授)/保留原值(续期);暂不支持从有限期改回永不过期。</p>
          </Field>
        </FieldGroup>
        <div className="flex justify-end">
          <Button disabled={!canGrant || selectedRoleId === "" || assigning} onClick={() => { void assignRole(); }}>
            {assigning && <Spinner data-icon="inline-start" />}
            <ShieldCheck />
            授予
          </Button>
        </div>
      </div>
    </div>
  );
}
