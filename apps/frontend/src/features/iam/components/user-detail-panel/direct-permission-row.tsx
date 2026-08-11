import type { UserDirectPermission } from "@/api/globals";
import { format } from "date-fns";
import { CalendarClock, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";

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
      <Item variant="outline" size="sm">
        <ItemContent>
          <div className="flex items-center gap-2">
            <ItemTitle>{perm.permission.label}</ItemTitle>
            <Badge variant={perm.effect === "deny" ? "destructive" : "secondary"}>
              {perm.effect === "deny" ? "拒绝" : "允许"}
            </Badge>
            {expired && <Badge variant="destructive">已过期</Badge>}
          </div>
          {perm.expiresAt != null && !expired && (
            <ItemDescription className="flex items-center gap-1">
              <CalendarClock className="size-3" />
              {format(new Date(perm.expiresAt), "yyyy-MM-dd")}
            </ItemDescription>
          )}
        </ItemContent>
        {canRevoke && (
          <ItemActions>
            <Button variant="ghost" size="sm" onClick={() => { setConfirming(true); }}>
              <X data-icon="inline-start" />
              撤销
            </Button>
          </ItemActions>
        )}
      </Item>
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
