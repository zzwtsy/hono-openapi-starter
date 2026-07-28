import type { UserSummary } from "@/api/globals";
import { useState } from "react";
import Apis from "@/api";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { IAM_ACTIONS, refreshIam } from "../../lib/iam-actions";
import { ResetPasswordDialog } from "../reset-password-dialog";
import { UserForm } from "../user-form";

interface OrgOption {
  label: string;
  value: string;
}

interface UserDialogsProps {
  user: UserSummary;
  editing: boolean;
  resetting: boolean;
  disabling: boolean;
  transferring: boolean;
  orgOptions: OrgOption[];
  getOrgPath: (orgId: string) => string;
  onEditingChange: (open: boolean) => void;
  onResettingChange: (open: boolean) => void;
  onDisablingChange: (open: boolean) => void;
  onTransferringChange: (open: boolean) => void;
  onTransferred?: (newOrgId: string) => void;
}

export function UserDialogs({ user, editing, resetting, disabling, transferring, orgOptions, getOrgPath, onEditingChange, onResettingChange, onDisablingChange, onTransferringChange, onTransferred }: UserDialogsProps) {
  const { mutate: runWithToast, busy: disablingBusy } = useToastMutation();
  const [targetOrgId, setTargetOrgId] = useState<string>("");
  const { mutate: runTransferWithToast, busy: transferringBusy } = useToastMutation();

  const handleEditSuccess = () => {
    onEditingChange(false);
    refreshIam(IAM_ACTIONS.usersList);
  };

  const handleResetSuccess = () => {
    onResettingChange(false);
  };

  const confirmDisable = async () => {
    const ok = await runWithToast(
      () => Apis.IAM.disableUser({ pathParams: { userId: user.id } }),
      { successMessage: "用户已禁用", errorMessage: "禁用失败" },
    );
    if (ok) {
      onDisablingChange(false);
      refreshIam(IAM_ACTIONS.usersList);
    }
  };

  const confirmTransfer = async () => {
    if (targetOrgId === "" || targetOrgId === user.orgId) {
      return;
    }
    const ok = await runTransferWithToast(
      () => Apis.IAM.transferUserOrganization({
        pathParams: { userId: user.id },
        data: { orgId: targetOrgId },
      }),
      { successMessage: "调岗成功", errorMessage: "调岗失败" },
    );
    if (ok) {
      onTransferringChange(false);
      setTargetOrgId("");
      refreshIam(IAM_ACTIONS.usersList);
      onTransferred?.(targetOrgId);
    }
  };

  return (
    <>
      <Dialog open={editing} onOpenChange={onEditingChange}>
        <DialogContent>
          {editing && <UserForm key={user.id} user={user} onSuccess={handleEditSuccess} />}
        </DialogContent>
      </Dialog>

      <Dialog open={resetting} onOpenChange={onResettingChange}>
        <DialogContent>
          {resetting && <ResetPasswordDialog key={user.id} user={user} onSuccess={handleResetSuccess} />}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={disabling}
        busy={disablingBusy}
        title="禁用用户"
        description={`确认禁用用户「${user.name}」?对方将立即下线且无法重新登录,直至重新启用。`}
        confirmLabel="禁用"
        onConfirm={() => { void confirmDisable(); }}
        onClose={() => onDisablingChange(false)}
      />

      <Dialog
        open={transferring}
        onOpenChange={(open) => {
          onTransferringChange(open);
          if (!open) {
            setTargetOrgId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调岗</DialogTitle>
            <DialogDescription>
              将用户「
              {user.name}
              」调到新组织。旧组织独有路径上的授权将被清理,共同祖先上的授权保留。
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>目标组织</FieldLabel>
            <Select
              items={orgOptions.filter(o => o.value !== user.orgId)}
              value={targetOrgId}
              onValueChange={(val) => {
                if (val != null) {
                  setTargetOrgId(val);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择目标组织" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {orgOptions.filter(o => o.value !== user.orgId).map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {getOrgPath(item.value)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => onTransferringChange(false)}>取消</Button>
            <Button
              disabled={targetOrgId === "" || transferringBusy}
              onClick={() => { void confirmTransfer(); }}
            >
              确认调岗
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
