import { actionDelegationMiddleware, useRequest } from "alova/client";
import { Ban, Check, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { DatePicker } from "@/components/shared/date-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCan } from "@/hooks/use-permissions";
import { IAM_ACTIONS, refreshIam } from "../../iam-actions";
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
  const [assigning, setAssigning] = useState(false);

  const refresh = () => {
    refreshIam(IAM_ACTIONS.userDirectPerms, IAM_ACTIONS.userPermissions);
  };

  const assignPermission = async () => {
    if (selectedPermission === "" || assigning) {
      return;
    }
    setAssigning(true);
    try {
      await Apis.IAM.assignUserPermission({
        pathParams: { userId, permission: selectedPermission },
        data: { orgId, effect, expiresAt: expiresAt ?? undefined },
      });
      toast.success(`${effect === "deny" ? "已拒绝" : "已允许"} ${selectedPermission}`);
      setSelectedPermission("");
      setEffect("allow");
      setExpiresAt(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "授权失败");
    } finally {
      setAssigning(false);
    }
  };

  const revoke = async (permission: string) => {
    try {
      await Apis.IAM.deleteUserPermission({ pathParams: { userId, permission }, params: { orgId } });
      toast.success("直接权限已撤销");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "撤销失败");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">已授直接权限</h4>
        {loading
          ? <Skeleton className="h-16 w-full" />
          : error
            ? (
                <p className="text-sm text-muted-foreground">
                  加载失败,
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { void send(); }}>重试</Button>
                </p>
              )
            : directPerms === undefined || directPerms.length === 0
              ? <p className="text-sm text-muted-foreground">暂无直接授权。</p>
              : (
                  <div className="flex flex-col gap-2">
                    {directPerms.map(p => (
                      <DirectPermissionRow key={p.permission} perm={p} onRevoke={() => { void revoke(p.permission); }} />
                    ))}
                  </div>
                )}
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
