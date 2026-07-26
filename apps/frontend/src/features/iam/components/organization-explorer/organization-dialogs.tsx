import type { Organization } from "@/api/globals";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OrganizationForm } from "../organization-form";

interface OrganizationDialogsProps {
  creatingParentId: string | null | undefined;
  editing: Organization | undefined;
  deleting: Organization | undefined;
  deletingBusy: boolean;
  organizations: Organization[] | undefined;
  onCloseCreate: () => void;
  onCloseEdit: () => void;
  onCloseDelete: () => void;
  onCreated: (org: Organization) => void | Promise<void>;
  onUpdated: (org: Organization) => void | Promise<void>;
  onConfirmDelete: () => void;
}

/**
 * 组织浏览器对话框区:创建 / 编辑 Dialog + 删除确认。
 * 抽出以降低 OrganizationExplorer 函数行数与复杂度(见 code-style §4)。
 */
export function OrganizationDialogs({
  creatingParentId,
  editing,
  deleting,
  deletingBusy,
  organizations,
  onCloseCreate,
  onCloseEdit,
  onCloseDelete,
  onCreated,
  onUpdated,
  onConfirmDelete,
}: OrganizationDialogsProps) {
  return (
    <>
      <Dialog
        open={creatingParentId !== undefined}
        onOpenChange={(open) => {
          if (!open)
            onCloseCreate();
        }}
      >
        <DialogContent>
          {creatingParentId !== undefined && organizations !== undefined && (
            <OrganizationForm
              organizations={organizations}
              defaultParentId={creatingParentId ?? undefined}
              onSuccess={onCreated}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open)
            onCloseEdit();
        }}
      >
        <DialogContent>
          {editing !== undefined && organizations !== undefined && (
            <OrganizationForm
              key={editing.id}
              organizations={organizations}
              organization={editing}
              onSuccess={onUpdated}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleting !== undefined}
        busy={deletingBusy}
        title="删除组织"
        description={`确认删除组织“${deleting?.name}”吗？此操作不可撤销。`}
        confirmLabel="删除组织"
        onConfirm={onConfirmDelete}
        onClose={onCloseDelete}
      />
    </>
  );
}
