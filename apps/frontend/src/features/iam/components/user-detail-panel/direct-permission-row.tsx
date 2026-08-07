import type { UserDirectPermission } from "@/api/globals";
import { format } from "date-fns";
import { CalendarClock, X } from "lucide-react";
import { Can } from "@/components/shared/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DirectPermissionRowProps {
  perm: UserDirectPermission;
  onRevoke: () => void;
}

export function DirectPermissionRow({ perm, onRevoke }: DirectPermissionRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{`${perm.permission.label}（${perm.permission.code}）`}</span>
          <Badge variant={perm.effect === "deny" ? "destructive" : "secondary"}>
            {perm.effect === "deny" ? "拒绝" : "允许"}
          </Badge>
        </div>
        {perm.expiresAt != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3" />
            {format(new Date(perm.expiresAt), "yyyy-MM-dd")}
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
