import { actionDelegationMiddleware, useRequest } from "alova/client";
import { Ban, Check, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Apis from "@/shared/api";
import { useCan } from "@/shared/lib/use-permissions";
import { useToastMutation } from "@/shared/lib/use-toast-mutation";
import { AsyncListState } from "@/shared/ui/async-list";
import { Button } from "@/shared/ui/button";
import { DatePicker } from "@/shared/ui/date-picker";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { IAM_ACTIONS, refreshIam } from "../../model/iam-actions";
import { PermissionCombobox } from "../permission-combobox";
import { DirectPermissionRow } from "./direct-permission-row";

interface DirectPermissionsTabProps {
  userId: string;
  orgId: string;
}

export function DirectPermissionsTab({ userId, orgId }: DirectPermissionsTabProps) {
  const canGrant = useCan("assignments.grant");
  const { data: catalog } = useRequest(() => Apis.IAM.listPermissions());
  const {
    data: directPerms,
    loading,
    error,
    send,
  } = useRequest(
    () => Apis.IAM.listUserDirectPermissions({ pathParams: { userId }, params: { orgId } }),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.userDirectPerms) },
  );

  const [selectedPermission, setSelectedPermission] = useState("");
  const [effect, setEffect] = useState<"allow" | "deny">("allow");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const { mutate: runWithToast, busy: assigning } = useToastMutation();

  const refresh = () => {
    refreshIam(IAM_ACTIONS.userDirectPerms, IAM_ACTIONS.userPermissions);
  };

  const assignPermission = async () => {
    if (selectedPermission === "" || assigning) {
      return;
    }
    const ok = await runWithToast(
      () => Apis.IAM.assignUserPermission({
        pathParams: { userId, permission: selectedPermission },
        data: { orgId, effect, expiresAt: expiresAt ?? undefined },
      }),
      { successMessage: `${effect === "deny" ? "已拒绝" : "已允许"} ${selectedPermission}`, errorMessage: "授权失败" },
    );
    if (ok) {
      setSelectedPermission("");
      setEffect("allow");
      setExpiresAt(null);
      refresh();
    }
  };

  const revoke = async (permission: string) => {
    const ok = await runWithToast(
      () => Apis.IAM.deleteUserPermission({ pathParams: { userId, permission }, params: { orgId } }),
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
                    <DirectPermissionRow key={p.permission} perm={p} onRevoke={() => { void revoke(p.permission); }} />
                  ))}
                </div>
              )}
        </AsyncListState>
      </div>

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
          <Button disabled={!canGrant || selectedPermission === "" || assigning} onClick={() => { void assignPermission(); }}>
            {assigning && <Spinner data-icon="inline-start" />}
            <ShieldCheck />
            授予
          </Button>
        </div>
      </div>
    </div>
  );
}
