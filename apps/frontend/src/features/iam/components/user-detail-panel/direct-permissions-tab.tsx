import type { PermissionRef, UserDirectPermission } from "@/api/globals";
import type { PermissionCode } from "@/types/permissions";
import { actionDelegationMiddleware, useRequest, useWatcher } from "alova/client";
import { Ban, Check, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { AsyncListState } from "@/components/shared/async-list";
import { DatePicker } from "@/components/shared/date-picker";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ItemGroup } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { useIamUserCapabilities } from "../../hooks/use-iam-capabilities";
import { IAM_ACTIONS, refreshIam } from "../../lib/iam-actions";
import { PermissionCombobox } from "../permission-combobox";
import { DirectPermissionRow } from "./direct-permission-row";

interface DirectPermissionsTabProps {
  userId: string;
  userHomeOrgId: string;
  orgId: string;
  currentUserId: string;
}

interface DirectPermissionFormProps {
  catalog?: PermissionRef[];
  selectedPermission: PermissionCode | "";
  effect: "allow" | "deny";
  expiresAt: string | null;
  editingPermissionCode: PermissionCode | null;
  assigning: boolean;
  onPermissionChange: (permissionCode: PermissionCode) => void;
  onEffectChange: (effect: "allow" | "deny") => void;
  onExpiresAtChange: (expiresAt: string | null) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

function DirectPermissionForm({
  catalog,
  selectedPermission,
  effect,
  expiresAt,
  editingPermissionCode,
  assigning,
  onPermissionChange,
  onEffectChange,
  onExpiresAtChange,
  onCancel,
  onSubmit,
}: DirectPermissionFormProps) {
  return (
    <>
      <Separator />
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">{editingPermissionCode === null ? "授予直接权限" : "编辑直接授权"}</h4>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="perm-select">选择权限</FieldLabel>
            <PermissionCombobox
              value={selectedPermission === "" ? null : selectedPermission}
              onChange={onPermissionChange}
              permissions={catalog ?? []}
              disabled={editingPermissionCode !== null}
            />
          </Field>
          <Field>
            <FieldLabel>效果</FieldLabel>
            <ToggleGroup
              value={[effect]}
              onValueChange={(val) => {
                const next = val[val.length - 1];
                if (next != null) {
                  onEffectChange(next as "allow" | "deny");
                }
              }}
            >
              <ToggleGroupItem value="allow">
                <Check />
                允许
              </ToggleGroupItem>
              <ToggleGroupItem value="deny">
                <Ban />
                拒绝
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="perm-expires">过期时间(可选)</FieldLabel>
            <DatePicker id="perm-expires" value={expiresAt} onChange={onExpiresAtChange} />
            <p className="text-xs text-muted-foreground">留空表示永不过期；编辑已有授权时可清除日期恢复永久。</p>
          </Field>
        </FieldGroup>
        <div className="flex justify-end gap-2">
          {editingPermissionCode !== null && (
            <Button variant="outline" disabled={assigning} onClick={onCancel}>
              取消
            </Button>
          )}
          <Button disabled={selectedPermission === "" || assigning} onClick={onSubmit}>
            {assigning && <Spinner data-icon="inline-start" />}
            <ShieldCheck data-icon="inline-start" />
            {editingPermissionCode === null ? "授予" : "保存"}
          </Button>
        </div>
      </div>
    </>
  );
}

export function DirectPermissionsTab({ userId, userHomeOrgId, orgId, currentUserId }: DirectPermissionsTabProps) {
  const { canReadAssignments, canGrantDirectPermissions: canGrant, canRevokeAssignments: canRevoke } = useIamUserCapabilities(currentUserId, userId, userHomeOrgId, orgId);
  const { data: catalog } = useRequest(() => Apis.IAM.listPermissions(), { immediate: canGrant });
  const {
    data: directPerms,
    loading,
    error,
    send,
  } = useWatcher(
    () => Apis.IAM.listUserDirectPermissions({ pathParams: { userId }, params: { orgId } }),
    [orgId],
    { immediate: canReadAssignments, middleware: actionDelegationMiddleware(IAM_ACTIONS.userDirectPerms) },
  );

  const [selectedPermission, setSelectedPermission] = useState<PermissionCode | "">("");
  const [effect, setEffect] = useState<"allow" | "deny">("allow");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [editingPermissionCode, setEditingPermissionCode] = useState<PermissionCode | null>(null);
  const { mutate: runWithToast, busy: assigning } = useToastMutation();
  const selectedPermissionLabel = catalog?.find(permission => permission.code === selectedPermission)?.label;

  const refresh = () => {
    refreshIam(IAM_ACTIONS.userDirectPerms, IAM_ACTIONS.userPermissions, IAM_ACTIONS.authorization);
  };

  const assignPermission = async () => {
    if (selectedPermission === "" || assigning) {
      return;
    }
    const ok = await runWithToast(
      () => Apis.IAM.assignUserPermission({
        pathParams: { userId, permissionCode: selectedPermission },
        data: { orgId, effect, expiresAt: editingPermissionCode === null ? (expiresAt ?? undefined) : expiresAt },
      }),
      { successMessage: editingPermissionCode === null ? `${effect === "deny" ? "已拒绝" : "已允许"} ${selectedPermissionLabel ?? "权限"}` : "直接授权已更新", errorMessage: "授权失败" },
    );
    if (ok) {
      setSelectedPermission("");
      setEffect("allow");
      setExpiresAt(null);
      setEditingPermissionCode(null);
      refresh();
    }
  };

  const startEdit = (perm: UserDirectPermission) => {
    setEditingPermissionCode(perm.permission.code);
    setSelectedPermission(perm.permission.code);
    setEffect(perm.effect);
    setExpiresAt(perm.expiresAt);
  };

  const cancelEdit = () => {
    setEditingPermissionCode(null);
    setSelectedPermission("");
    setEffect("allow");
    setExpiresAt(null);
  };

  const revoke = async (permissionCode: PermissionCode) => {
    const ok = await runWithToast(
      () => Apis.IAM.deleteUserPermission({ pathParams: { userId, permissionCode }, params: { orgId } }),
      { successMessage: "直接权限已撤销", errorMessage: "撤销失败" },
    );
    if (ok) {
      refresh();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">已授直接权限</h4>
        <AsyncListState
          loading={loading}
          error={error}
          data={directPerms}
          onRetry={() => { void send(); }}
          loadingFallback={<Skeleton className="h-16 w-full" />}
          errorDescription="无法获取直接授权。"
        >
          {directPerms === undefined || directPerms.length === 0
            ? (
                <Empty className="min-h-28 p-4">
                  <EmptyMedia variant="icon"><ShieldCheck /></EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>暂无直接授权</EmptyTitle>
                    <EmptyDescription>该用户在当前组织没有直接权限。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            : (
                <ItemGroup>
                  {directPerms.map(p => (
                    <DirectPermissionRow
                      key={p.permission.code}
                      perm={p}
                      canEdit={canGrant}
                      canRevoke={canRevoke}
                      busy={assigning}
                      onEdit={() => { startEdit(p); }}
                      onRevoke={() => { void revoke(p.permission.code); }}
                    />
                  ))}
                </ItemGroup>
              )}
        </AsyncListState>
      </div>

      {canGrant && (
        <DirectPermissionForm
          catalog={catalog}
          selectedPermission={selectedPermission}
          effect={effect}
          expiresAt={expiresAt}
          editingPermissionCode={editingPermissionCode}
          assigning={assigning}
          onPermissionChange={setSelectedPermission}
          onEffectChange={setEffect}
          onExpiresAtChange={setExpiresAt}
          onCancel={cancelEdit}
          onSubmit={() => { void assignPermission(); }}
        />
      )}
    </div>
  );
}
