import type { Role } from "@/api/globals";
import { actionDelegationMiddleware, useRequest, useWatcher } from "alova/client";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { DatePicker } from "@/components/shared/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useCan } from "@/hooks/use-permissions";
import { IAM_ACTIONS, refreshIam } from "../../iam-actions";
import { RoleAssignmentRow } from "./role-assignment-row";

interface RoleAssignmentsTabProps {
  userId: string;
  orgId: string;
  roles: Role[];
  onNavigateRole: (roleId: string) => void;
}

export function RoleAssignmentsTab({ userId, orgId, roles, onNavigateRole }: RoleAssignmentsTabProps) {
  const canGrant = useCan("assignments.grant");
  const {
    data: assignments,
    loading,
    error,
    send,
  } = useRequest(
    () => Apis.IAM.listUserRoles({ pathParams: { userId }, params: { orgId } }),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.userRoles) },
  );
  // 当前有效权限(与 EffectivePermissionsPanel 同 key,alova 自动共享缓存),用于授予预览
  const { data: effectiveResult } = useRequest(
    () => Apis.IAM.listUserPermissions({ pathParams: { userId }, params: { orgId } }),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.userPermissions) },
  );

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  // useWatcher 监听 selectedRoleId:选中角色自动用新 roleId 拉权限,
  // 修此前 sendPreview 闭包用旧 roleId(初始 "")-> 404 -> 显示 0 项权限的 bug。
  const { data: previewPerms } = useWatcher(
    () => Apis.IAM.listRolePermissions({ pathParams: { roleId: selectedRoleId } }),
    [selectedRoleId],
    { immediate: false },
  );
  // 授予后将新增哪些权限(用户当前未持有)
  const newPerms = useMemo(() => {
    if (previewPerms === undefined || effectiveResult === undefined) {
      return undefined;
    }
    const have = new Set(effectiveResult.effective.map(p => p.permission));
    return previewPerms.filter(p => !have.has(p));
  }, [previewPerms, effectiveResult]);

  const roleItems = [
    { label: "请选择角色...", value: null },
    ...roles.map(r => ({ label: r.name, value: r.id })),
  ];

  const refresh = () => {
    refreshIam(IAM_ACTIONS.userRoles, IAM_ACTIONS.userPermissions);
  };

  const assignRole = async () => {
    if (selectedRoleId === "" || assigning) {
      return;
    }
    setAssigning(true);
    try {
      await Apis.IAM.assignUserRole({
        pathParams: { userId, roleId: selectedRoleId },
        data: { orgId, expiresAt: expiresAt ?? undefined },
      });
      toast.success("角色已授予");
      setSelectedRoleId("");
      setExpiresAt(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "授权失败");
    } finally {
      setAssigning(false);
    }
  };

  const revoke = async (roleId: string) => {
    try {
      await Apis.IAM.deleteUserRole({ pathParams: { userId, roleId }, params: { orgId } });
      toast.success("角色已撤销");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "撤销失败");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">已授角色</h4>
        {loading
          ? <Skeleton className="h-16 w-full" />
          : error
            ? (
                <p className="text-sm text-muted-foreground">
                  加载失败,
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { void send(); }}>重试</Button>
                </p>
              )
            : assignments === undefined || assignments.length === 0
              ? <p className="text-sm text-muted-foreground">暂无已授角色。</p>
              : (
                  <div className="flex flex-col gap-2">
                    {assignments.map(a => (
                      <RoleAssignmentRow key={a.roleId} assignment={a} onRevoke={() => { void revoke(a.roleId); }} onNavigateRole={onNavigateRole} />
                    ))}
                  </div>
                )}
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
