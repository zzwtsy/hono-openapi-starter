import type { UserAccessQueryState } from "../../hooks/use-user-access-data";
import type { PermissionRef, UserDirectPermission, UserPermissionsResult } from "@/api/globals";
import type { PermissionCode } from "@/types/permissions";
import { useRequest } from "alova/client";
import { Ban, Check, CircleAlert, Info, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { AsyncListState } from "@/components/shared/async-list";
import { DatePicker } from "@/components/shared/date-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ItemGroup } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { useIamUserCapabilities } from "../../hooks/use-iam-capabilities";
import { IAM_ACTIONS, refreshIam } from "../../lib/iam-actions";
import { PermissionCombobox } from "../permission-combobox";
import { DirectPermissionRow } from "./direct-permission-row";

interface DirectPermissionsTabProps {
  userId: string;
  userName: string;
  userHomeOrgId: string;
  orgId: string;
  orgPath: string;
  currentUserId: string;
  query: UserAccessQueryState<UserDirectPermission[]>;
  effectiveResult?: UserPermissionsResult;
}

function DenyWarning({ permission, effectiveResult }: { permission?: PermissionRef; effectiveResult?: UserPermissionsResult }) {
  const roleNames = [...new Set(
    effectiveResult?.effective
      .find(item => item.permission.code === permission?.code)
      ?.sources
      .filter(source => source.type === "role")
      .map(source => source.roleName)
      .filter((name): name is string => name !== null) ?? [],
  )];
  let description = "选择权限后可确认受影响的角色来源。";
  if (permission !== undefined) {
    description = roleNames.length > 0
      ? `“${permission.label}”当前来自角色 ${roleNames.join("、")}；保存后这些来源将不再生效。`
      : `“${permission.label}”保存后将被拒绝；未来通过角色授予的同一权限也不会生效。`;
  }
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>拒绝规则会覆盖角色授权</AlertTitle>
      <AlertDescription>
        {description}
      </AlertDescription>
    </Alert>
  );
}

interface DirectPermissionDialogProps {
  open: boolean;
  busy: boolean;
  userName: string;
  orgPath: string;
  catalog?: PermissionRef[];
  selectedPermission: PermissionCode | "";
  selectedPermissionRef?: PermissionRef;
  effect: "allow" | "deny";
  expiresAt: string | null;
  editingPermissionCode: PermissionCode | null;
  effectiveResult?: UserPermissionsResult;
  onClose: () => void;
  onPermissionChange: (permission: PermissionCode) => void;
  onEffectChange: (effect: "allow" | "deny") => void;
  onExpiresAtChange: (expiresAt: string | null) => void;
  onSubmit: () => void;
}

function DirectPermissionDialog({ open, busy, userName, orgPath, catalog, selectedPermission, selectedPermissionRef, effect, expiresAt, editingPermissionCode, effectiveResult, onClose, onPermissionChange, onEffectChange, onExpiresAtChange, onSubmit }: DirectPermissionDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen)
          onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{editingPermissionCode === null ? "添加例外规则" : "编辑例外规则"}</DialogTitle>
          <DialogDescription>
            {userName}
            {" · "}
            {orgPath}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>权限</FieldLabel>
            <PermissionCombobox value={selectedPermission === "" ? null : selectedPermission} onChange={onPermissionChange} permissions={catalog ?? []} disabled={editingPermissionCode !== null || busy} />
          </Field>
          <Field>
            <FieldLabel>效果</FieldLabel>
            <ToggleGroup
              value={[effect]}
              disabled={busy}
              onValueChange={(value) => {
                const next = value.at(-1);
                if (next === "allow" || next === "deny")
                  onEffectChange(next);
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
            <FieldDescription>允许用于补充权限；拒绝会覆盖同一权限的角色来源。</FieldDescription>
          </Field>
          {effect === "deny" && <DenyWarning permission={selectedPermissionRef} effectiveResult={effectiveResult} />}
          <Field>
            <FieldLabel htmlFor="permission-expires">有效期</FieldLabel>
            <DatePicker id="permission-expires" value={expiresAt} onChange={onExpiresAtChange} disabled={busy} />
            <FieldDescription>留空表示永不过期；清除已有日期会恢复为永久。</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>取消</Button>
          <Button disabled={selectedPermission === "" || busy} onClick={onSubmit}>
            {busy && <Spinner data-icon="inline-start" />}
            <ShieldCheck data-icon="inline-start" />
            保存规则
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DirectPermissionsTab({ userId, userName, userHomeOrgId, orgId, orgPath, currentUserId, query, effectiveResult }: DirectPermissionsTabProps) {
  const { canGrantDirectPermissions: canGrant, canRevokeAssignments: canRevoke } = useIamUserCapabilities(currentUserId, userId, userHomeOrgId, orgId);
  const { data: catalog } = useRequest(() => Apis.IAM.listPermissions(), { immediate: canGrant });
  const [selectedPermission, setSelectedPermission] = useState<PermissionCode | "">("");
  const [effect, setEffect] = useState<"allow" | "deny">("allow");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [editingPermissionCode, setEditingPermissionCode] = useState<PermissionCode | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate: runWithToast, busy: assigning } = useToastMutation();
  const selectedPermissionRef = catalog?.find(permission => permission.code === selectedPermission);

  const resetForm = () => {
    setSelectedPermission("");
    setEffect("allow");
    setExpiresAt(null);
    setEditingPermissionCode(null);
  };
  const closeDialog = () => {
    if (assigning)
      return;
    resetForm();
    setDialogOpen(false);
  };
  const refresh = () => {
    refreshIam(IAM_ACTIONS.userDirectPerms, IAM_ACTIONS.userPermissions, IAM_ACTIONS.authorization);
  };
  const assignPermission = async () => {
    if (selectedPermission === "" || assigning)
      return;
    const ok = await runWithToast(
      () => Apis.IAM.assignUserPermission({
        pathParams: { userId, permissionCode: selectedPermission },
        data: { orgId, effect, expiresAt: editingPermissionCode === null ? (expiresAt ?? undefined) : expiresAt },
      }),
      { successMessage: editingPermissionCode === null ? "例外规则已添加" : "例外规则已更新", errorMessage: "保存失败" },
    );
    if (ok) {
      resetForm();
      setDialogOpen(false);
      refresh();
    }
  };
  const startEdit = (permission: UserDirectPermission) => {
    setEditingPermissionCode(permission.permission.code);
    setSelectedPermission(permission.permission.code);
    setEffect(permission.effect);
    setExpiresAt(permission.expiresAt);
    setDialogOpen(true);
  };
  const revoke = async (permissionCode: PermissionCode) => {
    const ok = await runWithToast(
      () => Apis.IAM.deleteUserPermission({ pathParams: { userId, permissionCode }, params: { orgId } }),
      { successMessage: "例外规则已撤销", errorMessage: "撤销失败" },
    );
    if (ok)
      refresh();
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="direct-permissions-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h3 id="direct-permissions-title" className="text-sm font-semibold">例外规则</h3>
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="ghost" size="icon-xs" aria-label="什么是例外规则" />}><Info /></TooltipTrigger>
            <TooltipContent>针对单个用户补充或拒绝一项权限；拒绝优先于角色授权。</TooltipContent>
          </Tooltip>
        </div>
        {canGrant && (
          <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(true); }}>
            <Plus data-icon="inline-start" />
            添加例外规则
          </Button>
        )}
      </div>

      <AsyncListState loading={query.loading} error={query.error} data={query.data} onRetry={query.retry} loadingFallback={<Skeleton className="h-16 w-full" />} errorDescription="无法获取例外规则。">
        {query.data === undefined || query.data.length === 0
          ? (
              <Empty className="min-h-20 p-3">
                <EmptyHeader>
                  <EmptyTitle>暂无例外规则</EmptyTitle>
                  <EmptyDescription>当前权限全部由角色授权决定。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          : (
              <ItemGroup>
                {query.data.map(permission => (
                  <DirectPermissionRow
                    key={permission.permission.code}
                    perm={permission}
                    canEdit={canGrant}
                    canRevoke={canRevoke}
                    busy={assigning}
                    onEdit={() => { startEdit(permission); }}
                    onRevoke={() => { void revoke(permission.permission.code); }}
                  />
                ))}
              </ItemGroup>
            )}
      </AsyncListState>

      <DirectPermissionDialog
        open={dialogOpen}
        busy={assigning}
        userName={userName}
        orgPath={orgPath}
        catalog={catalog}
        selectedPermission={selectedPermission}
        selectedPermissionRef={selectedPermissionRef}
        effect={effect}
        expiresAt={expiresAt}
        editingPermissionCode={editingPermissionCode}
        effectiveResult={effectiveResult}
        onClose={closeDialog}
        onPermissionChange={setSelectedPermission}
        onEffectChange={setEffect}
        onExpiresAtChange={setExpiresAt}
        onSubmit={() => { void assignPermission(); }}
      />
    </section>
  );
}
