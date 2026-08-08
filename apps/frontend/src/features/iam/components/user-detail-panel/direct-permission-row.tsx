import type { UserDirectPermission } from "@/api/globals";
import { format } from "date-fns";
import { CalendarClock, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DirectPermissionRowProps {
  perm: UserDirectPermission;
  canRevoke: boolean;
  busy: boolean;
  onRevoke: () => void;
}

export function DirectPermissionRow({ perm, canRevoke, busy, onRevoke }: DirectPermissionRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [now] = useState(() => Date.now());
  const expired = perm.expiresAt != null && new Date(perm.expiresAt).getTime() <= now;

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{perm.permission.label}</span>
            <Badge variant={perm.effect === "deny" ? "destructive" : "secondary"}>
              {perm.effect === "deny" ? "拒绝" : "允许"}
            </Badge>
            {expired && <Badge variant="destructive">已过期</Badge>}
          </div>
          {perm.expiresAt != null && !expired && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3" />
              {format(new Date(perm.expiresAt), "yyyy-MM-dd")}
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
        title="撤销直接权限"
        description={`确认撤销直接权限“${perm.permission.label}”吗？`}
        confirmLabel="撤销权限"
        onConfirm={() => {
          onRevoke();
          setConfirming(false);
        }}
        onClose={() => { setConfirming(false); }}
      />
    </>
  );
}
