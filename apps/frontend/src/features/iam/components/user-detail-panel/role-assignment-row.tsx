import { format } from "date-fns";
import { CalendarClock, X } from "lucide-react";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";

interface RoleAssignmentRowProps {
  assignment: { roleId: string; roleName: string; orgId: string; expiresAt: string | null };
  onRevoke: () => void;
  onNavigateRole: (roleId: string) => void;
}

export function RoleAssignmentRow({ assignment, onRevoke, onNavigateRole }: RoleAssignmentRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          className="text-left text-sm font-medium hover:underline"
          onClick={() => { onNavigateRole(assignment.roleId); }}
        >
          {assignment.roleName}
        </button>
        {assignment.expiresAt != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3" />
            {format(new Date(assignment.expiresAt), "yyyy-MM-dd")}
          </span>
        )}
      </div>
      <Can permission="assignments.revoke">
        <Button variant="ghost" size="sm" onClick={onRevoke}>
          <X />
          撤销
        </Button>
      </Can>
    </div>
  );
}
