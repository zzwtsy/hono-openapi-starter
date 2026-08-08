import { format } from "date-fns";
import { CalendarClock, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";

interface RoleAssignmentRowProps {
  assignment: { roleId: string; roleName: string; orgId: string; expiresAt: string | null };
  canRevoke: boolean;
  busy: boolean;
  onRevoke: () => void;
  onNavigateRole: (roleId: string, orgId?: string) => void;
}

export function RoleAssignmentRow({ assignment, canRevoke, busy, onRevoke, onNavigateRole }: RoleAssignmentRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [now] = useState(() => Date.now());
  const expired = assignment.expiresAt != null && new Date(assignment.expiresAt).getTime() <= now;

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            className="text-left text-sm font-medium hover:underline"
            onClick={() => { onNavigateRole(assignment.roleId, assignment.orgId); }}
          >
            {assignment.roleName}
          </button>
          {assignment.expiresAt != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3" />
              {expired ? "已过期" : format(new Date(assignment.expiresAt), "yyyy-MM-dd")}
            </span>
          )}
        </div>
        {canRevoke && (
          <Button variant="ghost" size="sm" onClick={() => { setConfirming(true); }}>
            <X />
            撤销
          </Button>
        )}
      </div>
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
