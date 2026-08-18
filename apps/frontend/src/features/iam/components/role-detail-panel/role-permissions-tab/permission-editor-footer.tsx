import type { RoleUserAssignment } from "@/api/globals";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

interface PermissionEditorFooterProps {
  toAddCount: number;
  toRemoveCount: number;
  canReadAssignments: boolean;
  affectedUsers: RoleUserAssignment[] | undefined;
  affectedUsersLoading: boolean;
  affectedUsersError: unknown;
  submitting: boolean;
  onRetryAffectedUsers: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

function getImpactLabel(loading: boolean, error: unknown, count: number): string {
  if (loading) {
    return "正在计算影响范围…";
  }
  if (error != null) {
    return "影响范围加载失败";
  }
  return `将影响 ${count} 位已授用户`;
}

export function PermissionEditorFooter({ toAddCount, toRemoveCount, canReadAssignments, affectedUsers, affectedUsersLoading, affectedUsersError, submitting, onRetryAffectedUsers, onCancel, onSubmit }: PermissionEditorFooterProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const hasChanges = toAddCount > 0 || toRemoveCount > 0;

  return (
    <div className="flex shrink-0 flex-col gap-3">
      <Separator />
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{`新增 ${toAddCount} · 撤销 ${toRemoveCount}`}</p>
        {canReadAssignments
          ? (
              <Collapsible>
                <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" className="h-auto self-start p-0" />}>
                  {getImpactLabel(affectedUsersLoading, affectedUsersError, affectedUsers?.length ?? 0)}
                  <ChevronDown data-icon="inline-end" />
                </CollapsibleTrigger>
                <CollapsibleContent className="flex flex-col gap-1 pt-2 text-xs text-muted-foreground">
                  {affectedUsersError != null
                    ? <Button type="button" variant="outline" size="sm" className="self-start" onClick={onRetryAffectedUsers}>重试</Button>
                    : affectedUsers?.map(user => (
                        <span key={`${user.userId}-${user.orgId}`}>
                          {user.userName}
                          {" "}
                          ·
                          {" "}
                          {user.email}
                        </span>
                      ))}
                </CollapsibleContent>
              </Collapsible>
            )
          : <p className="text-xs text-muted-foreground">缺少 assignments.read，影响范围不可见。</p>}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={() => hasChanges ? setCancelDialogOpen(true) : onCancel()}>取消编辑</Button>
        <Button type="button" size="sm" disabled={!hasChanges || submitting} onClick={onSubmit}>
          {submitting && <Spinner data-icon="inline-start" />}
          保存更改
        </Button>
      </div>
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃未保存的权限更改？</AlertDialogTitle>
            <AlertDialogDescription>当前新增和撤销的权限草稿将被清除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onCancel();
                setCancelDialogOpen(false);
              }}
            >
              放弃更改
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
