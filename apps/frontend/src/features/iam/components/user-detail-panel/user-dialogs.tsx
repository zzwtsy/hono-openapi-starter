import type { UserSummary } from "@/api/globals";
import Apis from "@/api";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { IAM_ACTIONS, refreshIam } from "../../lib/iam-actions";
import { ResetPasswordDialog } from "../reset-password-dialog";
import { UserForm } from "../user-form";

interface UserDialogsProps {
  user: UserSummary;
  editing: boolean;
  resetting: boolean;
  disabling: boolean;
  onEditingChange: (open: boolean) => void;
  onResettingChange: (open: boolean) => void;
  onDisablingChange: (open: boolean) => void;
}

export function UserDialogs({ user, editing, resetting, disabling, onEditingChange, onResettingChange, onDisablingChange }: UserDialogsProps) {
  const { mutate: runWithToast, busy: disablingBusy } = useToastMutation();

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
    </>
  );
}
