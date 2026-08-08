import type { PermissionCode } from "@/types/permissions";
import { actionDelegationMiddleware, useRequest, useWatcher } from "alova/client";
import { Ban, Check, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { AsyncListState } from "@/components/shared/async-list";
import { DatePicker } from "@/components/shared/date-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
  orgId: string;
  currentUserId: string;
}

export function DirectPermissionsTab({ userId, orgId, currentUserId }: DirectPermissionsTabProps) {
  const { canReadAssignments, canGrantDirectPermissions: canGrant, canRevokeAssignments: canRevoke } = useIamUserCapabilities(currentUserId, userId);
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
  const { mutate: runWithToast, busy: assigning } = useToastMutation();
  const selectedPermissionLabel = catalog?.find(permission => permission.code === selectedPermission)?.label;

  const refresh = () => {
    refreshIam(IAM_ACTIONS.userDirectPerms, IAM_ACTIONS.userPermissions);
  };

  const assignPermission = async () => {
    if (selectedPermission === "" || assigning) {
      return;
    }
    const ok = await runWithToast(
      () => Apis.IAM.assignUserPermission({
        pathParams: { userId, permissionCode: selectedPermission },
        data: { orgId, effect, expiresAt: expiresAt ?? undefined },
      }),
      { successMessage: `${effect === "deny" ? "已拒绝" : "已允许"} ${selectedPermissionLabel ?? "权限"}`, errorMessage: "授权失败" },
    );
    if (ok) {
      setSelectedPermission("");
      setEffect("allow");
      setExpiresAt(null);
      refresh();
    }
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
            ? <p className="text-sm text-muted-foreground">暂无直接授权。</p>
            : (
                <div className="flex flex-col gap-2">
                  {directPerms.map(p => (
                    <DirectPermissionRow
                      key={p.permission.code}
                      perm={p}
                      canRevoke={canRevoke}
                      busy={assigning}
                      onRevoke={() => { void revoke(p.permission.code); }}
                    />
                  ))}
                </div>
              )}
        </AsyncListState>
      </div>

      {canGrant && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">授予直接权限</h4>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="perm-select">选择权限</FieldLabel>
                <PermissionCombobox
                  value={selectedPermission === "" ? null : selectedPermission}
                  onChange={setSelectedPermission}
                  permissions={catalog ?? []}
                />
              </Field>
              <Field>
                <FieldLabel>效果</FieldLabel>
                <ToggleGroup
                  value={[effect]}
                  onValueChange={(val) => {
                    const next = val[val.length - 1];
                    if (next != null) {
                      setEffect(next as "allow" | "deny");
                    }
                  }}
                >
                  <ToggleGroupItem value="allow">
                    <Check className="size-3.5" />
                    允许
                  </ToggleGroupItem>
                  <ToggleGroupItem value="deny">
                    <Ban className="size-3.5" />
                    拒绝
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="perm-expires">过期时间(可选)</FieldLabel>
                <DatePicker id="perm-expires" value={expiresAt} onChange={setExpiresAt} />
              </Field>
            </FieldGroup>
            <div className="flex justify-end">
              <Button disabled={selectedPermission === "" || assigning} onClick={() => { void assignPermission(); }}>
                {assigning && <Spinner data-icon="inline-start" />}
                <ShieldCheck />
                授予
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
