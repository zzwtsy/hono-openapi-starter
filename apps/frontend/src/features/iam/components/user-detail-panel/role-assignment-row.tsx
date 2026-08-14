import { format } from "date-fns";
import { CalendarClock, Pencil, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription } from "@/components/ui/item";

interface RoleAssignmentRowProps {
  assignment: { roleId: string; roleName: string; orgId: string; expiresAt: string | null };
  canEdit: boolean;
  canRevoke: boolean;
  busy: boolean;
  onEdit: () => void;
  onRevoke: () => void;
  onNavigateRole: (roleId: string, orgId?: string) => void;
}

export function RoleAssignmentRow({ assignment, canEdit, canRevoke, busy, onEdit, onRevoke, onNavigateRole }: RoleAssignmentRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [now] = useState(() => Date.now());
  const expired = assignment.expiresAt != null && new Date(assignment.expiresAt).getTime() <= now;

  return (
    <>
      <Item variant="outline" size="sm">
        <ItemContent>
          <button
            type="button"
            className="text-left text-sm font-medium hover:underline"
            onClick={() => { onNavigateRole(assignment.roleId, assignment.orgId); }}
          >
            {assignment.roleName}
          </button>
          {assignment.expiresAt != null && (
            <ItemDescription className="flex items-center gap-1">
              <CalendarClock className="size-3" />
              {expired ? "已过期" : format(new Date(assignment.expiresAt), "yyyy-MM-dd")}
            </ItemDescription>
          )}
        </ItemContent>
        {(canEdit || canRevoke) && (
          <ItemActions>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Pencil data-icon="inline-start" />
                编辑
              </Button>
            )}
            {canRevoke && (
              <Button variant="ghost" size="sm" onClick={() => { setConfirming(true); }}>
                <X data-icon="inline-start" />
                撤销
              </Button>
            )}
          </ItemActions>
        )}
      </Item>
      <ConfirmDeleteDialog
        open={confirming}
        busy={busy}
        title="撤销角色授权"
        description={`确认撤销角色“${assignment.roleName}”在当前组织的授权吗？`}
        confirmLabel="撤销授权"
        onConfirm={() => {
          onRevoke();
          setConfirming(false);
        }}
        onClose={() => { setConfirming(false); }}
      />
    </>
  );
}
